// ── app/api/webhook/route.ts ───────────────────────────────────────────────────
// Handles incoming webhooks from Meta WhatsApp Cloud API.
//
// TWO handlers live here:
//
//   GET  → Webhook verification
//          When you register this URL in Meta Developer Console, Meta sends
//          a one-time GET request to confirm this URL belongs to you.
//          We check the verify token and respond with the challenge string.
//
//   POST → Incoming messages
//          Every time someone sends a message to the WhatsApp Business number,
//          Meta sends a POST here with the message data.
//
// Full product-listing flow:
//   1. Seller sends an image to the WhatsApp Business number
//   2. Meta sends this POST with a media ID (not a direct URL)
//   3. We ask Meta for the download URL using the media ID
//   4. We download the image bytes (requires auth header)
//   5. Upload to Cloudinary → get permanent CDN URL
//   6. Send image + caption to Gemini → get product name, price, description
//   7. Save product to Supabase
//   8. Send seller a WhatsApp confirmation
//
// Special command: send "SOLD" as a text message to mark the most recent
// product as sold.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }                    from 'next/server'
import { createHmac }                                  from 'crypto'
import { extractProductInfo }                           from '@/lib/gemini'
import { uploadProductImage }                           from '@/lib/cloudinary'
import { supabaseAdmin }                                from '@/lib/supabase'
import { notifySeller, productListedMessage }           from '@/lib/notify'

// ── GET: Webhook verification ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // If the verify token matches what we set in Meta console → confirm ownership
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// ── POST: Incoming messages ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Signature verification ────────────────────────────────────────────────
    // Meta signs every webhook delivery with HMAC-SHA256 using META_APP_SECRET.
    // We verify before processing to block forged requests.
    // Only enforced when META_APP_SECRET is set — safe to deploy before the
    // env var is added, but MUST be set before going live.
    const rawBody   = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.META_APP_SECRET

    if (appSecret) {
      const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
      if (signature !== expected) {
        console.warn('Webhook rejected — signature mismatch')
        // Return 200 so Meta does not retry; we just silently drop it
        return NextResponse.json({ ok: false })
      }
    }

    const body = JSON.parse(rawBody)

    // Meta wraps everything in a nested structure:
    // body.entry[0].changes[0].value.messages[0]
    const value    = body.entry?.[0]?.changes?.[0]?.value
    const messages = value?.messages

    // If no messages (e.g. delivery receipt, read receipt) → ignore silently
    if (!messages || messages.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const message   = messages[0]
    const messageId = message.id  // unique Meta message ID (for deduplication)

    // ── Handle "SOLD" text command ────────────────────────────────────────────
    if (message.type === 'text') {
      const text = (message.text?.body || '').trim().toUpperCase()

      if (text === 'SOLD') {
        const { data: latest } = await supabaseAdmin
          .from('products')
          .select('id, name')
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (latest) {
          await supabaseAdmin
            .from('products')
            .update({ status: 'sold' })
            .eq('id', latest.id)

          await notifySeller(`🎉 Marked as SOLD: "${latest.name}"`)
        }
      }

      return NextResponse.json({ ok: true })
    }

    // ── Handle image messages → list as product ───────────────────────────────
    if (message.type !== 'image') {
      // Ignore voice notes, stickers, documents, etc.
      return NextResponse.json({ ok: true })
    }

    const mediaId = message.image?.id
    const caption = message.image?.caption || ''

    if (!mediaId) return NextResponse.json({ ok: true })

    // Deduplication: don't list the same message twice
    if (messageId) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('wa_message_id', messageId)
        .single()

      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    const accessToken = process.env.META_ACCESS_TOKEN!

    // ── Step 1: Ask Meta for the image download URL ───────────────────────────
    // Meta gives us a media ID, not a direct URL.
    // We must exchange the ID for a real download URL first.
    const mediaRes = await fetch(
      `https://graph.facebook.com/v25.0/${mediaId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (!mediaRes.ok) throw new Error(`Failed to get media info: ${mediaRes.status}`)
    const mediaInfo       = await mediaRes.json()
    const imageDownloadUrl = mediaInfo.url

    // ── Step 2: Download the image bytes (auth header required) ──────────────
    // Meta's image URLs expire and require a Bearer token to download.
    const imageRes = await fetch(imageDownloadUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    if (!imageRes.ok) throw new Error(`Failed to download image: ${imageRes.status}`)

    const imageBuffer = await imageRes.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const mimeType    = imageRes.headers.get('content-type') || 'image/jpeg'
    const dataUri     = `data:${mimeType};base64,${imageBase64}`

    // ── Step 3: Upload to Cloudinary ──────────────────────────────────────────
    const optimizedImageUrl = await uploadProductImage(dataUri)

    // ── Step 4: Extract product details with Gemini ───────────────────────────
    const productInfo = await extractProductInfo(dataUri, caption)

    // ── Step 5: Save to Supabase ──────────────────────────────────────────────
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        name:          productInfo.name,
        description:   productInfo.description,
        price:         productInfo.price,
        currency:      productInfo.currency,
        category:      productInfo.category,
        image_url:     optimizedImageUrl,
        status:        'available',
        wa_message_id: messageId || null,
      })
      .select()
      .single()

    if (error) throw error

    // ── Step 6: Notify seller ─────────────────────────────────────────────────
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`
    await notifySeller(productListedMessage(productInfo.name, productInfo.price, productUrl))

    return NextResponse.json({ ok: true, product })

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Webhook processing error:', msg)
    // Always return 200 so Meta does not retry endlessly
    return NextResponse.json({ ok: false })
  }
}

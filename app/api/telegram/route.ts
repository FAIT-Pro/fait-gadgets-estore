// ── app/api/telegram/route.ts ──────────────────────────────────────────────────
// Webhook handler for the Telegram bot — replaces the Meta WhatsApp Cloud API
// as the listing channel (Meta business verification was rejected).
//
// Telegram sends one POST per incoming message/photo. There is no GET
// verification step like Meta requires — registering the webhook URL with
// Telegram's setWebhook endpoint is enough.
//
// Full product-listing flow:
//   1. Seller sends a photo to the bot (with optional caption)
//   2. Telegram POSTs the update here with a file_id (not a direct URL)
//   3. downloadTelegramFile() resolves file_id → file_path → downloads bytes
//   4. Upload to Cloudinary → get permanent CDN URL
//   5. Send image + caption to Gemini → get product name, price, description
//   6. Save product to Supabase
//   7. Reply to the seller in the same Telegram chat with a confirmation
//
// Special command: send "SOLD" as a text message to mark the most recent
// available product as sold — same behaviour as the Meta webhook's SOLD command.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }            from 'next/server'
import { extractProductInfo }                   from '@/lib/gemini'
import { uploadProductImage }                   from '@/lib/cloudinary'
import { supabaseAdmin }                        from '@/lib/supabase'
import { sendTelegramMessage, downloadTelegramFile, productListedMessage } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    const message = update.message

    // No message (e.g. edited_message, channel_post) → ignore silently
    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId    = String(message.chat?.id)
    const messageId = message.message_id ? `tg_${message.message_id}` : null

    // ── Handle "SOLD" text command ────────────────────────────────────────────
    if (typeof message.text === 'string') {
      const text = message.text.trim().toUpperCase()

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

          await sendTelegramMessage(chatId, `🎉 Marked as SOLD: "${latest.name}"`)
        } else {
          await sendTelegramMessage(chatId, 'No available products to mark as sold.')
        }
      }

      return NextResponse.json({ ok: true })
    }

    // ── Handle photo messages → list as product ───────────────────────────────
    const photos = message.photo
    if (!photos || photos.length === 0) {
      // Ignore voice notes, stickers, documents, etc.
      return NextResponse.json({ ok: true })
    }

    // Telegram sends multiple sizes of the same photo — take the largest (last)
    const fileId  = photos[photos.length - 1].file_id
    const caption = message.caption || ''

    // Deduplication: don't list the same message twice (e.g. Telegram retries)
    if (messageId) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('wa_message_id', messageId)
        .single()

      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    // ── Step 1: Download the photo bytes ──────────────────────────────────────
    const dataUri = await downloadTelegramFile(fileId)

    // ── Step 2: Upload to Cloudinary ───────────────────────────────────────────
    const optimizedImageUrl = await uploadProductImage(dataUri)

    // ── Step 3: Extract product details with Gemini ───────────────────────────
    const productInfo = await extractProductInfo(dataUri, caption)

    // ── Step 4: Save to Supabase ───────────────────────────────────────────────
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
        wa_message_id: messageId,
      })
      .select()
      .single()

    if (error) throw error

    // ── Step 5: Confirm in the Telegram chat ───────────────────────────────────
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`
    await sendTelegramMessage(chatId, productListedMessage(productInfo.name, productInfo.price, productUrl))

    return NextResponse.json({ ok: true, product })

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Telegram webhook processing error:', msg)
    // Always return 200 — same rule as the Meta webhook, prevents retry storms
    return NextResponse.json({ ok: false })
  }
}

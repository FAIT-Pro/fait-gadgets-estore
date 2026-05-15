// ── app/api/webhook/route.ts ───────────────────────────────────────────────────
// This is the BRAIN of the whole system.
//
// Here's what happens every time you forward a product image to your bot:
//
//   1. Green API receives the message → sends it here via webhook
//   2. We check it has an image (skip plain text messages)
//   3. Upload the image to Cloudinary
//   4. Send image + caption to Gemini AI → get product name, price, description
//   5. Save the product to Supabase database
//   6. Send YOU a WhatsApp confirmation
//
// Special command: if you send "SOLD" to the bot, it marks your most
// recent product as sold and removes it from the storefront.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { extractProductInfo }       from '@/lib/gemini'
import { uploadProductImage }       from '@/lib/cloudinary'
import { supabaseAdmin }            from '@/lib/supabase'
import { notifySeller, productListedMessage } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ── Guard: only process messages, not delivery receipts etc. ──────────────
    if (body.typeWebhook !== 'incomingMessageReceived') {
      return NextResponse.json({ ok: true })
    }

    const messageData = body.messageData
    if (!messageData) return NextResponse.json({ ok: true })

    const messageType = messageData.typeMessage?.toLowerCase()

    // ── Handle "SOLD" command (text message) ──────────────────────────────────
    if (messageType === 'textmessage') {
      const text = (messageData.textMessageData?.textMessage || '').trim().toUpperCase()

      if (text === 'SOLD') {
        // Mark the most recently listed product as sold
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
    if (messageType !== 'imagemessage') {
      // Ignore voice notes, stickers, documents etc.
      return NextResponse.json({ ok: true })
    }

    const imageData = messageData.imageMessageData
    const imageUrl  = imageData?.downloadUrl
    const caption   = imageData?.caption || ''

    if (!imageUrl) {
      return NextResponse.json({ ok: true })
    }

    // Deduplication: don't list the same WhatsApp message twice
    const messageId = body.idMessage
    if (messageId) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('wa_message_id', messageId)
        .single()

      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    // ── Step 1: Upload image to Cloudinary ────────────────────────────────────
    const optimizedImageUrl = await uploadProductImage(imageUrl)

    // ── Step 2: Extract product details with Gemini AI ────────────────────────
    const productInfo = await extractProductInfo(imageUrl, caption)

    // ── Step 3: Save to database ──────────────────────────────────────────────
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

    // ── Step 4: Notify you on WhatsApp ────────────────────────────────────────
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`
    await notifySeller(productListedMessage(productInfo.name, productInfo.price, productUrl))

    return NextResponse.json({ ok: true, product })

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Return 200 so Green API doesn't keep retrying a broken message
    return NextResponse.json({ ok: false, error: 'Processing failed' })
  }
}

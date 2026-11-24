// ── app/api/enquire/route.ts ───────────────────────────────────────────────────
// Receives a "Request to Buy" form submission from a visitor:
//   1. Saves the buyer's contact details to the enquiries table
//   2. Logs it as an 'enquiry' interaction (for stats)
//   3. Notifies the seller via Telegram
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server'
import { supabaseAdmin }              from '@/lib/supabase'
import { sendTelegramMessage }        from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const { productId, productName, buyerName, buyerPhone, message, contactPreference } = await request.json()

    if (!buyerName?.trim() || !buyerPhone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const preference = contactPreference === 'call' ? 'Call' : 'WhatsApp'
    const note = `[Prefers: ${preference}]`
    const storedMessage = message?.trim() ? `${note} ${message.trim()}` : note

    const enquiryResult = await supabaseAdmin.from('enquiries').insert({
      product_id:   productId   || null,
      product_name: productName || 'Unknown product',
      buyer_name:   buyerName.trim(),
      buyer_phone:  buyerPhone.trim(),
      message:      storedMessage,
    })

    if (enquiryResult.error) throw new Error(enquiryResult.error.message)

    if (productId) {
      const interactionResult = await supabaseAdmin.from('interactions').insert({
        product_id: productId,
        type:       'enquiry',
        visitor_id: null,
      })
      if (interactionResult.error) throw new Error(interactionResult.error.message)
    }

    const msgText = message?.trim() ? `\n\nMessage: "${message.trim()}"` : ''
    await sendTelegramMessage(
      process.env.TELEGRAM_CHAT_ID!,
      `🛒 New buy request!\n\n` +
      `📦 ${productName}\n` +
      `👤 ${buyerName.trim()}\n` +
      `📱 ${buyerPhone.trim()}\n` +
      `📞 Preferred contact: ${preference}` +
      msgText
    )

    return NextResponse.json({ ok: true })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Enquiry failed'
    console.error('Enquiry error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

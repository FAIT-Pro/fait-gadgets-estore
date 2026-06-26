// ── app/api/track/route.ts ────────────────────────────────────────────────────
// Every time a visitor does something on the store (likes, saves, enquires),
// the browser calls this API endpoint to:
//   1. Save the interaction to the database (for your records)
//   2. Send you a Telegram notification (for likes, saves, enquiries)
//
// Views are tracked silently — too many notifications for views would be noisy.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage, visitorInteractionMessage } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const { productId, productName, type, visitorId } = await request.json()

    // Validate the interaction type
    const validTypes = ['view', 'like', 'save', 'enquiry']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 })
    }

    // ── Save to database ──────────────────────────────────────────────────────
    await supabaseAdmin.from('interactions').insert({
      product_id: productId,
      type,
      visitor_id: visitorId || null,
    })

    // ── Notify seller for meaningful actions (not plain views) ────────────────
    const chatId = process.env.TELEGRAM_CHAT_ID!
    if (type === 'like') {
      await sendTelegramMessage(chatId, visitorInteractionMessage('liked', productName))
    } else if (type === 'save') {
      await sendTelegramMessage(chatId, visitorInteractionMessage('saved', productName))
    } else if (type === 'enquiry') {
      await sendTelegramMessage(chatId, visitorInteractionMessage('asked about', productName))
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}

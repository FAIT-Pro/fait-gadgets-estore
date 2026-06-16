// ── app/api/enquire/route.ts ───────────────────────────────────────────────────
// Receives a "Request to Buy" form submission from a visitor:
//   1. Saves the buyer's contact details to the enquiries table
//   2. Logs it as an 'enquiry' interaction (for stats)
//   3. Notifies the seller (Meta WhatsApp for now — will be swapped to Telegram)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server'
import { supabaseAdmin }              from '@/lib/supabase'
import { notifySeller }               from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    const { productId, productName, buyerName, buyerPhone, message } = await request.json()

    if (!buyerName?.trim() || !buyerPhone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Save buyer contact details
    await supabaseAdmin.from('enquiries').insert({
      product_id:   productId   || null,
      product_name: productName || 'Unknown product',
      buyer_name:   buyerName.trim(),
      buyer_phone:  buyerPhone.trim(),
      message:      message?.trim() || null,
    })

    // Also log in interactions so the product stats view picks it up
    if (productId) {
      await supabaseAdmin.from('interactions').insert({
        product_id: productId,
        type:       'enquiry',
        visitor_id: null,
      })
    }

    // Notify the seller with full buyer details
    const msgText = message?.trim() ? `\n\nMessage: "${message.trim()}"` : ''
    await notifySeller(
      `🛒 New buy request!\n\n` +
      `📦 ${productName}\n` +
      `👤 ${buyerName.trim()}\n` +
      `📱 ${buyerPhone.trim()}` +
      msgText
    )

    return NextResponse.json({ ok: true })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Enquiry failed'
    console.error('Enquiry error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── lib/notify.ts ─────────────────────────────────────────────────────────────
// Sends the seller a WhatsApp notification via Meta Cloud API when things happen:
//   → A new product is successfully listed
//   → A visitor likes, saves, or sends an enquiry
//
// The WhatsApp Business number (test: +1 555-637-0351) sends a text message
// to the seller's personal phone (SELLER_PHONE env var).
//
// To change who receives notifications: update SELLER_PHONE in .env.local
// and in Vercel dashboard → Environment Variables.
// Format: country code + number, no + sign.
// Example: Nigerian number 08012345678 → 2348012345678
// ─────────────────────────────────────────────────────────────────────────────

export async function notifySeller(message: string): Promise<void> {
  const sellerPhone   = process.env.SELLER_PHONE         // recipient
  const accessToken   = process.env.META_ACCESS_TOKEN    // Meta Bearer token
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID // WhatsApp Business number ID

  if (!sellerPhone || !accessToken || !phoneNumberId) {
    console.warn('Meta notifications not configured. Skipping.')
    return
  }

  try {
    await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:   sellerPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    )
  } catch (err) {
    // Notifications failing should never crash the main product listing flow
    console.error('Meta notification failed:', err)
  }
}

// ── Pre-built message templates ───────────────────────────────────────────────

export function productListedMessage(name: string, price: number | null, productUrl: string) {
  const priceText = price ? `₦${price.toLocaleString()}` : 'No price set'
  return (
    `✅ New product listed!\n\n` +
    `📦 ${name}\n` +
    `💰 ${priceText}\n\n` +
    `View on store: ${productUrl}`
  )
}

export function visitorInteractionMessage(
  action: 'liked' | 'saved' | 'asked about',
  productName: string
) {
  const emojis = { liked: '❤️', saved: '🔖', 'asked about': '💬' }
  const emoji  = emojis[action] || '🔔'
  return `${emoji} Someone ${action} your product:\n\n"${productName}"\n\nCheck your store for activity.`
}

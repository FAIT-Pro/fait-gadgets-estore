// ── lib/notify.ts ─────────────────────────────────────────────────────────────
// This module sends YOU (the seller) WhatsApp messages when things happen:
//   → A new product is successfully listed
//   → A visitor likes, saves, or sends an enquiry
//
// We use CallMeBot — a free service that lets you send yourself WhatsApp messages
// with one API call. No extra app needed; the message goes straight to your
// normal WhatsApp number.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a WhatsApp message to the seller's phone via CallMeBot.
 *
 * @param message - The text to send (supports emoji ✅)
 */
export async function notifySeller(message: string): Promise<void> {
  const phone  = process.env.SELLER_PHONE         // e.g. "2348012345678"
  const apiKey = process.env.CALLMEBOT_API_KEY    // from CallMeBot setup

  if (!phone || !apiKey) {
    // Fail silently in dev if not configured — don't crash the app
    console.warn('CallMeBot not configured. Skipping notification.')
    return
  }

  const encodedMessage = encodeURIComponent(message)
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`

  try {
    await fetch(url)
  } catch (err) {
    // Notifications failing should never crash the main product listing flow
    console.error('CallMeBot notification failed:', err)
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
  const emoji = emojis[action] || '🔔'
  return `${emoji} Someone ${action} your product:\n\n"${productName}"\n\nCheck your store for activity.`
}

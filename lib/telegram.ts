// ── lib/telegram.ts ────────────────────────────────────────────────────────────
// All seller-facing notifications and the listing bot run through here — no
// business verification, no token expiry (the Meta WhatsApp Cloud API this
// replaced had both problems, and was retired entirely in Session 9).
//
// sendTelegramMessage() sends every seller notification: new listing, like,
// save, enquiry, SOLD confirmation, edit confirmation.
// downloadTelegramFile() turns an incoming photo's file_id into a base64 dataUri,
// ready to hand to uploadProductImage() and extractProductInfo() unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    console.warn('Telegram not configured (TELEGRAM_BOT_TOKEN missing). Skipping.')
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`Telegram sendMessage failed [${res.status}]:`, body)
    }
  } catch (err) {
    console.error('Telegram sendMessage network error:', err)
  }
}

/**
 * Resolves a Telegram file_id to a base64 dataUri.
 * Telegram's two-step download: file_id → getFile (returns file_path) →
 * direct download from the file_path. No Bearer auth header needed.
 */
export async function downloadTelegramFile(fileId: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN!

  const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
  if (!fileInfoRes.ok) throw new Error(`Telegram getFile failed: ${fileInfoRes.status}`)
  const fileInfo = await fileInfoRes.json()
  const filePath = fileInfo.result?.file_path
  if (!filePath) throw new Error('Telegram getFile returned no file_path')

  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
  if (!fileRes.ok) throw new Error(`Telegram file download failed: ${fileRes.status}`)

  // Telegram's file server sends "application/octet-stream" regardless of the
  // actual file type — Gemini rejects that MIME type, so infer it from the
  // file extension in file_path instead (photos are always .jpg).
  const buffer   = Buffer.from(await fileRes.arrayBuffer())
  const ext      = filePath.split('.').pop()?.toLowerCase()
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

// ── Pre-built message templates ─────────────────────────────────────────────────

export function productListedMessage(name: string, price: number | null, productUrl: string, photoCount?: number) {
  const priceText = price ? `₦${price.toLocaleString()}` : 'No price set'
  const photoLine = photoCount && photoCount > 1 ? `📸 ${photoCount} photos\n` : ''
  return (
    `✅ New product listed!\n\n` +
    `📦 ${name}\n` +
    photoLine +
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

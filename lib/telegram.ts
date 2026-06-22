// ── lib/telegram.ts ────────────────────────────────────────────────────────────
// Telegram replacement for lib/notify.ts (Meta WhatsApp Cloud API).
// Telegram is simpler than Meta: no business verification, no token expiry,
// and file downloads need no auth header — just a file_id → getFile → direct URL.
//
// sendTelegramMessage() sends seller notifications (new listing, like, save,
// enquiry, SOLD confirmation) — same role notifySeller() plays for Meta.
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

// ── Pre-built message templates (mirrors lib/notify.ts) ────────────────────────

export function productListedMessage(name: string, price: number | null, productUrl: string) {
  const priceText = price ? `₦${price.toLocaleString()}` : 'No price set'
  return (
    `✅ New product listed!\n\n` +
    `📦 ${name}\n` +
    `💰 ${priceText}\n\n` +
    `View on store: ${productUrl}`
  )
}

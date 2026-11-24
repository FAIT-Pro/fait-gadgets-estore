// ── lib/cloudinary.ts ──────────────────────────────────────────────────────────
// Cloudinary is our image warehouse + delivery service.
// When a product image arrives from Telegram, we:
//   1. Upload it to Cloudinary for permanent, reliable storage
//   2. Let Cloudinary auto-optimize it (compress, resize, convert to WebP)
//   3. Store Telegram photos in a folder named after the product
//   4. Get back a fast CDN URL we can show on the storefront
//
// Think of it like handing a raw photo to a professional photo lab —
// they develop, crop, and hand back a polished print for display.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto'
import { v2 as cloudinary } from 'cloudinary'

// Configure with our credentials (loaded from environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function productAssetSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'product'
}

export function productAssetFolder(name: string): string {
  return `estore-products/${productAssetSlug(name)}`
}

function assetBaseName(name: string, key: string): string {
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 6)
  return `${productAssetSlug(name)}-${hash}`
}

/**
 * Accepts either a plain URL or a pre-downloaded base64 dataUri and uploads
 * to Cloudinary. When the webhook has already downloaded the image (Telegram
 * requires a two-step file download), passing the dataUri skips a redundant
 * download round-trip.
 *
 * @param input - Direct URL or base64 dataUri (data:mime/type;base64,...)
 * @param options - Optional target folder and public_id (used by Telegram)
 * @returns Optimized Cloudinary CDN URL for use in the storefront
 */
export async function uploadProductImage(
  input: string,
  options?: { folder?: string; publicId?: string }
): Promise<string> {
  let dataUri: string

  if (input.startsWith('data:')) {
    dataUri = input
  } else {
    const response = await fetch(input)
    if (!response.ok) {
      throw new Error(`Failed to download image (${response.status}): ${input}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: options?.folder ?? 'estore-products',
    ...(options?.publicId ? { public_id: options.publicId } : {}),
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  })

  return result.secure_url
}

export async function renameProductImage(url: string, folder: string, publicId: string): Promise<string> {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i)
  if (!match) return url

  const result = await cloudinary.uploader.rename(match[1], `${folder}/${publicId}`, {
    overwrite: true,
    invalidate: true,
  })

  return result?.secure_url || url
}

export function telegramAssetName(name: string, key: string, index: number): string {
  return `${assetBaseName(name, key)}-${index}`
}

export function telegramAssetBase(name: string, key: string): string {
  return assetBaseName(name, key)
}

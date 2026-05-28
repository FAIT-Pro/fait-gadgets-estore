// ── lib/cloudinary.ts ──────────────────────────────────────────────────────────
// Cloudinary is our image warehouse + delivery service.
// When a product image arrives from WhatsApp, we:
//   1. Upload it to Cloudinary for permanent, reliable storage
//   2. Let Cloudinary auto-optimize it (compress, resize, convert to WebP)
//   3. Get back a fast CDN URL we can show on the storefront
//
// Think of it like handing a raw photo to a professional photo lab —
// they develop, crop, and hand back a polished print for display.
// ─────────────────────────────────────────────────────────────────────────────

import { v2 as cloudinary } from 'cloudinary'

// Configure with our credentials (loaded from environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Accepts either a plain URL or a pre-downloaded base64 dataUri and uploads
 * to Cloudinary. When the webhook has already downloaded the image (Meta API
 * requires an auth header to download), passing the dataUri skips a redundant
 * download round-trip.
 *
 * @param input - Direct URL or base64 dataUri (data:mime/type;base64,...)
 * @returns Optimized Cloudinary CDN URL for use in the storefront
 */
export async function uploadProductImage(input: string): Promise<string> {
  let dataUri: string

  if (input.startsWith('data:')) {
    // Already a base64 dataUri — no download needed
    dataUri = input
  } else {
    // Plain URL — download the image bytes first
    const response = await fetch(input)
    if (!response.ok) {
      throw new Error(`Failed to download image (${response.status}): ${input}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`
  }

  // Upload the bytes directly to Cloudinary
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'estore-products',
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  })

  return result.secure_url
}

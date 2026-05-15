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
 * Downloads an image from a URL and uploads it to Cloudinary.
 * Returns the optimized, permanent CDN URL.
 *
 * @param imageUrl - Direct URL to the image (from Green API / WhatsApp)
 * @returns Optimized Cloudinary URL for use in the storefront
 */
export async function uploadProductImage(imageUrl: string): Promise<string> {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: 'estore-products',       // organizes uploads into a folder
    transformation: [
      // Resize: max 800×800px, keeping original proportions
      { width: 800, height: 800, crop: 'limit' },
      // Auto-compress to smallest file size without visible quality loss
      { quality: 'auto' },
      // Convert to WebP (loads faster on modern phones)
      { fetch_format: 'auto' },
    ],
  })

  return result.secure_url
}

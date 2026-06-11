// ── app/api/admin/analyze/route.ts ─────────────────────────────────────────────
// Receives a product photo from the admin upload form.
// Does two things simultaneously:
//   1. Uploads the image to Cloudinary → permanent CDN URL
//   2. Sends the image to Gemini AI → extracts name, description, price, category
//
// Returns both results to the browser so the upload form can pre-fill all fields.
// The seller can then edit any field before saving.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server'
import { isAdminAuthedFromRequest }   from '@/lib/auth'
import { uploadProductImage }         from '@/lib/cloudinary'
import { extractProductInfo }         from '@/lib/gemini'

export async function POST(request: NextRequest) {
  // Block anyone who is not logged in as admin
  if (!isAdminAuthedFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const caption  = (formData.get('caption') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Convert the uploaded file to a base64 dataUri
    // Both Cloudinary and Gemini accept this format
    const buffer   = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'image/jpeg'
    const dataUri  = `data:${mimeType};base64,${buffer.toString('base64')}`

    // Run Cloudinary upload and Gemini analysis at the same time (parallel)
    // This is faster than running them one after the other
    const [imageUrl, productInfo] = await Promise.all([
      uploadProductImage(dataUri),
      extractProductInfo(dataUri, caption),
    ])

    return NextResponse.json({
      ok:          true,
      imageUrl,
      name:        productInfo.name,
      description: productInfo.description,
      price:       productInfo.price,
      currency:    productInfo.currency,
      category:    productInfo.category,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Analysis failed'
    console.error('Analyze error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

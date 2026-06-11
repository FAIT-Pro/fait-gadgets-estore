// ── app/api/admin/upload-image/route.ts ───────────────────────────────────────
// Uploads a single image to Cloudinary and returns the CDN URL.
// Used by the admin upload form when adding extra photos to a product.
// No Gemini AI — just Cloudinary storage.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthedFromRequest }  from '@/lib/auth'
import { uploadProductImage }        from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  if (!isAdminAuthedFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file     = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'image/jpeg'
    const dataUri  = `data:${mimeType};base64,${buffer.toString('base64')}`

    const imageUrl = await uploadProductImage(dataUri)

    return NextResponse.json({ ok: true, imageUrl })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    console.error('Upload error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

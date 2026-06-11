// ── app/api/admin/images/route.ts ─────────────────────────────────────────────
// Returns all distinct image URLs already stored in the database.
// Used by the admin image picker so the seller can reuse existing photos
// without re-uploading them to Cloudinary.
//
// Response: { ok: true, images: string[] }
// Images are returned newest-first (most recently uploaded at the top).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server'
import { supabaseAdmin }              from '@/lib/supabase'
import { isAdminAuthedFromRequest }   from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!isAdminAuthedFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('image_url, image_urls, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Collect all URLs from every product, deduplicate, preserve newest-first order
  const seen   = new Set<string>()
  const images: string[] = []

  for (const product of data || []) {
    const urls = [
      ...(Array.isArray(product.image_urls) && product.image_urls.length
        ? product.image_urls
        : []),
      ...(product.image_url ? [product.image_url] : []),
    ]
    for (const url of urls) {
      if (url && !seen.has(url)) {
        seen.add(url)
        images.push(url)
      }
    }
  }

  return NextResponse.json({ ok: true, images })
}

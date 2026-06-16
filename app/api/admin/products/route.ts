// ── app/api/admin/products/route.ts ────────────────────────────────────────────
// Creates a new product in the database.
// Called when the seller clicks "Save as Draft" or "Publish Now" on the upload form.
//
//   status = 'draft'     → saved privately, not visible on storefront
//   status = 'available' → immediately visible to all visitors
//
// Requires admin authentication.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }  from 'next/server'
import { revalidatePath }             from 'next/cache'
import { supabaseAdmin }              from '@/lib/supabase'
import { isAdminAuthedFromRequest }   from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!isAdminAuthedFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const {
      imageUrls,
      name,
      description,
      price,
      currency,
      category,
      status,
    } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // imageUrls is the full array; primary image is the first element
    const allImages: string[] = Array.isArray(imageUrls) ? imageUrls : []

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name:        name.trim(),
        description: description?.trim() || null,
        price:       price ? parseFloat(price) : null,
        currency:    currency || 'NGN',
        category:    category || 'Other',
        image_url:   allImages[0] || null,
        image_urls:  allImages,
        status:      status === 'available' ? 'available' : 'draft',
      })
      .select()
      .single()

    if (error) throw error

    // Immediately refresh the storefront so the new product is visible
    revalidatePath('/')

    return NextResponse.json({ ok: true, product: data })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save product'
    console.error('Product create error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

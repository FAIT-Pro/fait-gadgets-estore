// ── app/api/admin/products/[id]/route.ts ──────────────────────────────────────
// Two actions for a specific product, both requiring admin login:
//
//   PATCH  → update fields (name, price, category, description, status)
//   DELETE → permanently remove the product from the database
//
// The [id] in the folder name means Next.js automatically captures the product
// ID from the URL, e.g. /api/admin/products/abc-123 → params.id = "abc-123"
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }     from 'next/server'
import { revalidatePath }               from 'next/cache'
import { supabaseAdmin }                 from '@/lib/supabase'
import { isAdminAuthedFromRequest }      from '@/lib/auth'

// ── PATCH: update a product ───────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Block anyone who isn't logged in as admin
  if (!isAdminAuthedFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/')
  revalidatePath(`/product/${params.id}`)

  return NextResponse.json({ ok: true, product: data })
}

// ── DELETE: remove a product permanently ─────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('Product delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/')

  return NextResponse.json({ ok: true })
}

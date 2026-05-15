// ── app/admin/dashboard/page.tsx ───────────────────────────────────────────────
// The seller's control panel — shows ALL products (available + sold).
// Fetches fresh data on every visit (force-dynamic).
// Each product row has Edit / Mark Sold / Re-list / Delete buttons
// (those are in the ProductActions client component below).
// ─────────────────────────────────────────────────────────────────────────────

import { redirect }      from 'next/navigation'
import { isAdminAuthed } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product }  from '@/lib/supabase'
import ProductActions    from './ProductActions'
import LogoutButton      from './LogoutButton'

// Always fetch live data — never serve a cached version of the dashboard
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Guard: if not logged in, send to login page
  if (!isAdminAuthed()) {
    redirect('/admin')
  }

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'

  // Fetch ALL products (admin can see sold items too)
  const { data } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  const products  = (data || []) as Product[]
  const available = products.filter(p => p.status === 'available').length
  const sold      = products.filter(p => p.status === 'sold').length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{storeName}</h1>
            <p className="text-xs text-gray-400">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-xs text-gray-500 hover:text-brand-600 transition-colors"
            >
              ← Back to store
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Stats summary ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{products.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Products</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-brand-600">{available}</p>
            <p className="text-xs text-gray-500 mt-1">Available</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-400">{sold}</p>
            <p className="text-xs text-gray-500 mt-1">Sold</p>
          </div>
        </div>

        {/* ── Section heading ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">All Products</h2>
          <p className="text-xs text-gray-400">
            Sorted newest first · Sold items shown at reduced opacity
          </p>
        </div>

        {/* ── Product list ─────────────────────────────────────────────────── */}
        {products.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-base font-medium text-gray-500">No products yet</p>
            <p className="text-sm mt-1">
              Forward a product image to your WhatsApp bot to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <ProductActions key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

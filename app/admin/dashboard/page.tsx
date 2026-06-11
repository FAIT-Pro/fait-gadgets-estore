// ── app/admin/dashboard/page.tsx ───────────────────────────────────────────────
// Seller's admin control panel.
// Products are split into three groups: Live, Drafts, Sold.
// The ProductTabs client component handles tab switching.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect }      from 'next/navigation'
import { isAdminAuthed } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product }  from '@/lib/supabase'
import ProductTabs       from './ProductTabs'
import LogoutButton      from './LogoutButton'

// Always fetch live data — never serve a cached version of the dashboard
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  if (!isAdminAuthed()) redirect('/admin')

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'

  // Fetch ALL products regardless of status (admin sees everything)
  const { data } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  const products = (data || []) as Product[]
  const live     = products.filter(p => p.status === 'available')
  const drafts   = products.filter(p => p.status === 'draft')
  const sold     = products.filter(p => p.status === 'sold')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{storeName}</h1>
            <p className="text-xs text-gray-400">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-gray-500 hover:text-brand-600 transition-colors"
            >
              ← Store
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Stats + Add button ───────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-8">

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 flex-1">
            <div className="bg-white rounded-xl border border-green-100 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-brand-600">{live.length}</p>
              <p className="text-xs text-gray-500 mt-1">Live</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-amber-500">{drafts.length}</p>
              <p className="text-xs text-gray-500 mt-1">Drafts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-gray-400">{sold.length}</p>
              <p className="text-xs text-gray-500 mt-1">Sold</p>
            </div>
          </div>

          {/* Add product button */}
          <a
            href="/admin/products/new"
            className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl
                       text-sm whitespace-nowrap self-center"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Add Product
          </a>
        </div>

        {/* ── Tabbed product list ──────────────────────────────────────────── */}
        {products.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-base font-medium text-gray-500">No products yet</p>
            <p className="text-sm mt-2">
              <a href="/admin/products/new" className="text-brand-600 font-medium hover:underline">
                + Add your first product
              </a>
            </p>
          </div>
        ) : (
          <ProductTabs live={live} drafts={drafts} sold={sold} />
        )}
      </main>
    </div>
  )
}

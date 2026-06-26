// ── app/page.tsx ──────────────────────────────────────────────────────────────
// The main storefront — shows all available products in a grid.
// This is a Server Component: it fetches products directly from Supabase
// on the server, then sends the ready HTML to the visitor's browser.
// This makes the page load fast and appear correctly on Google.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense }    from 'react'
import { supabase }    from '@/lib/supabase'
import ProductCard     from '@/components/ProductCard'
import SearchBar       from '@/components/SearchBar'
import ThemeToggle      from '@/components/ThemeToggle'
import type { Product } from '@/lib/supabase'

// On-demand revalidation fires on every admin publish/edit/delete.
// This fallback runs only if the on-demand call was missed.
export const revalidate = 600

const CATEGORIES = ['All', 'Fashion', 'Electronics', 'Food & Drinks', 'Beauty', 'Home & Living', 'Other']

export default async function StorePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string }
}) {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'
  const selectedCategory = searchParams.category || 'All'
  const searchQuery = searchParams.q || ''

  // ── Build the database query ───────────────────────────────────────────────
  let query = supabase
    .from('products')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (selectedCategory !== 'All') {
    query = query.eq('category', selectedCategory)
  }

  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`)
  }

  const { data: products } = await query
  const items = (products || []) as Product[]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800
                         sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{storeName}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">{items.length} items available</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Live search — Suspense required for useSearchParams in App Router */}
            <Suspense fallback={
              <input placeholder="Search products…"
                className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800
                           rounded-lg px-3 py-1.5 focus:outline-none w-36 md:w-52 opacity-50" disabled />
            }>
              <SearchBar />
            </Suspense>
            <ThemeToggle />
          </div>
        </div>

        {/* ── Category filter strip ─────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto
                        scrollbar-hide -mx-0 scroll-px-4">
          {CATEGORIES.map(cat => (
            <a
              key={cat}
              href={cat === 'All' ? '/' : `/?category=${encodeURIComponent(cat)}`}
              className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors
                ${selectedCategory === cat
                  ? 'bg-brand-600 text-white border-brand-600 font-medium'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-500'
                }`}
            >
              {cat}
            </a>
          ))}
        </div>
      </header>

      {/* ── Product Grid ─────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-5">
        {items.length === 0 ? (
          <div className="text-center py-24 text-gray-400 dark:text-gray-500">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">No products yet</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : 'Forward a product image to your bot to get started!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="text-center py-8 text-xs text-gray-400 dark:text-gray-500
                         border-t border-gray-100 dark:border-gray-800 mt-8">
        © {new Date().getFullYear()} {storeName} · All items subject to availability
      </footer>
    </div>
  )
}

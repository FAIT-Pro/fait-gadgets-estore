'use client'
// ── app/admin/dashboard/ProductActions.tsx ────────────────────────────────────
// One row in the admin product list. Handles all status transitions in-place.
// Editing fields opens the dedicated /admin/products/[id]/edit page.
//
// Status-specific buttons:
//   Draft   → [Edit] [Publish] [Delete]
//   Live    → [Edit] [Unpublish] [Mark Sold] [Copy URL] [Delete]
//   Sold    → [Edit] [Re-list] [Delete]
// ─────────────────────────────────────────────────────────────────────────────

import { useState }     from 'react'
import Image            from 'next/image'
import type { Product } from '@/lib/supabase'

export default function ProductActions({
  product: initialProduct,
}: {
  product: Product
}) {
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [copied,  setCopied]  = useState(false)

  if (deleted) return null

  async function patch(updates: Partial<Product>) {
    setLoading(true)
    const res  = await fetch(`/api/admin/products/${product.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.product) setProduct(data.product)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${product.name}"?\n\nThis cannot be undone.`)) return
    setLoading(true)
    await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    setDeleted(true)
  }

  function handleCopyUrl() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    navigator.clipboard.writeText(`${siteUrl}/product/${product.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const symbol       = product.currency === 'USD' ? '$' : '₦'
  const priceDisplay = product.price
    ? `${symbol}${product.price.toLocaleString()}`
    : 'No price set'

  const badge = {
    available: { label: '● Live',  cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/40' },
    draft:     { label: '◐ Draft', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40' },
    sold:      { label: '✓ Sold',  cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300' },
  }[product.status] ?? { label: product.status, cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300' }

  const rowOpacity = product.status === 'sold' ? 'opacity-50' : ''

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-opacity ${rowOpacity}`}>
      <div className="flex items-center gap-4">

        {/* Thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-2xl">
              📷
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-500">{priceDisplay}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{product.category}</p>
        </div>

        {/* Status badge */}
        <span className={`badge text-xs whitespace-nowrap ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">

          {/* Edit — opens dedicated full-page editor */}
          <a
            href={`/admin/products/${product.id}/edit`}
            className="text-xs text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400
                       border border-gray-200 dark:border-gray-700
                       hover:border-brand-300 dark:hover:border-brand-600 rounded-lg px-3 py-1.5 transition-colors"
          >
            Edit
          </a>

          {/* Draft: Publish */}
          {product.status === 'draft' && (
            <button
              onClick={() => patch({ status: 'available' })}
              disabled={loading}
              className="text-xs text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800
                         hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              {loading ? '…' : '🚀 Publish'}
            </button>
          )}

          {/* Live: Unpublish + Mark Sold + Copy URL */}
          {product.status === 'available' && (
            <>
              <button
                onClick={() => patch({ status: 'draft' })}
                disabled={loading}
                className="text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800
                           hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                {loading ? '…' : 'Unpublish'}
              </button>
              <button
                onClick={() => patch({ status: 'sold' })}
                disabled={loading}
                className="text-xs text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800
                           hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                {loading ? '…' : 'Mark Sold'}
              </button>
              <button
                onClick={handleCopyUrl}
                className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700
                           hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy URL'}
              </button>
            </>
          )}

          {/* Sold: Re-list */}
          {product.status === 'sold' && (
            <button
              onClick={() => patch({ status: 'available' })}
              disabled={loading}
              className="text-xs text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800
                         hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              {loading ? '…' : 'Re-list'}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                       border border-red-100 dark:border-red-900/50
                       hover:border-red-200 dark:hover:border-red-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

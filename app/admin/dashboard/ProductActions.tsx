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
    available: { label: '● Live',  cls: 'bg-green-50 text-green-700 border border-green-100' },
    draft:     { label: '◐ Draft', cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
    sold:      { label: '✓ Sold',  cls: 'bg-gray-100 text-gray-500' },
  }[product.status] ?? { label: product.status, cls: 'bg-gray-100 text-gray-500' }

  const rowOpacity = product.status === 'sold' ? 'opacity-50' : ''

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 transition-opacity ${rowOpacity}`}>
      <div className="flex items-center gap-4">

        {/* Thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
              📷
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{product.name}</p>
          <p className="text-sm font-semibold text-brand-600">{priceDisplay}</p>
          <p className="text-xs text-gray-400">{product.category}</p>
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
            className="text-xs text-gray-600 hover:text-brand-600 border border-gray-200
                       hover:border-brand-300 rounded-lg px-3 py-1.5 transition-colors"
          >
            Edit
          </a>

          {/* Draft: Publish */}
          {product.status === 'draft' && (
            <button
              onClick={() => patch({ status: 'available' })}
              disabled={loading}
              className="text-xs text-brand-600 border border-brand-200
                         hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors font-medium"
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
                className="text-xs text-amber-600 border border-amber-200
                           hover:bg-amber-50 rounded-lg px-3 py-1.5 transition-colors"
              >
                {loading ? '…' : 'Unpublish'}
              </button>
              <button
                onClick={() => patch({ status: 'sold' })}
                disabled={loading}
                className="text-xs text-orange-600 border border-orange-200
                           hover:bg-orange-50 rounded-lg px-3 py-1.5 transition-colors"
              >
                {loading ? '…' : 'Mark Sold'}
              </button>
              <button
                onClick={handleCopyUrl}
                className="text-xs text-gray-500 border border-gray-200
                           hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors"
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
              className="text-xs text-brand-600 border border-brand-200
                         hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors"
            >
              {loading ? '…' : 'Re-list'}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-700 border border-red-100
                       hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
// ── app/admin/dashboard/ProductActions.tsx ────────────────────────────────────
// One row in the admin product list.
// Shows the product image, name, price, category, and status — with three buttons:
//
//   Edit        → opens an inline form to change name / price / category / description
//   Mark Sold   → flips status to "sold" (hides from storefront)
//   Re-list     → flips status back to "available" (shows on storefront again)
//   Delete      → permanently removes the product (asks for confirmation first)
//
// All changes are sent to /api/admin/products/[id] and the UI updates
// instantly — no full page reload required.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }  from 'react'
import Image         from 'next/image'
import type { Product } from '@/lib/supabase'

const CATEGORIES = [
  'Fashion', 'Electronics', 'Food & Drinks',
  'Beauty', 'Home & Living', 'Other',
]

export default function ProductActions({
  product: initialProduct,
}: {
  product: Product
}) {
  // Keep a local copy of the product so we can update the UI optimistically
  const [product,     setProduct]     = useState(initialProduct)
  const [editing,     setEditing]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [deleted,     setDeleted]     = useState(false)

  // Edit form state — pre-filled from the product
  const [name,        setName]        = useState(product.name)
  const [price,       setPrice]       = useState(product.price?.toString() || '')
  const [category,    setCategory]    = useState(product.category)
  const [description, setDescription] = useState(product.description || '')

  // If deleted, render nothing (the row disappears)
  if (deleted) return null

  // ── Generic PATCH helper ───────────────────────────────────────────────────
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

  // ── Save edited fields ─────────────────────────────────────────────────────
  async function handleSave() {
    await patch({
      name,
      price:       price ? parseFloat(price) : null,
      category,
      description: description || null,
    })
    setEditing(false)
  }

  // ── Toggle available ↔ sold ────────────────────────────────────────────────
  async function handleToggleStatus() {
    const newStatus = product.status === 'available' ? 'sold' : 'available'
    await patch({ status: newStatus })
  }

  // ── Delete with confirmation ───────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm(`Delete "${product.name}"?\n\nThis cannot be undone.`)) return
    setLoading(true)
    await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    setDeleted(true)
  }

  // ── Format price for display ───────────────────────────────────────────────
  const symbol       = product.currency === 'USD' ? '$' : '₦'
  const priceDisplay = product.price
    ? `${symbol}${product.price.toLocaleString()}`
    : 'No price set'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-opacity
        ${product.status === 'sold'
          ? 'border-gray-100 opacity-50'
          : 'border-gray-100'
        }`}
    >

      {editing ? (
        /* ── EDIT FORM ──────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Product Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Price ({product.currency}) — leave blank if none
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Product description…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand-500
                         resize-none"
            />
          </div>

          {/* Form actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="btn-primary text-sm px-5 py-2"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                // Reset form fields if cancelled
                setName(product.name)
                setPrice(product.price?.toString() || '')
                setCategory(product.category)
                setDescription(product.description || '')
              }}
              className="btn-ghost text-sm px-5 py-2"
            >
              Cancel
            </button>
          </div>
        </div>

      ) : (
        /* ── PRODUCT ROW ────────────────────────────────────────────────────── */
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
              <div className="w-full h-full flex items-center justify-center
                              text-gray-300 text-2xl">
                📷
              </div>
            )}
          </div>

          {/* Name / price / category */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{product.name}</p>
            <p className="text-sm font-semibold text-brand-600">{priceDisplay}</p>
            <p className="text-xs text-gray-400">{product.category}</p>
          </div>

          {/* Status badge */}
          <span
            className={`badge text-xs whitespace-nowrap ${
              product.status === 'available'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {product.status === 'available' ? '● Available' : '✓ Sold'}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Edit */}
            <button
              onClick={() => setEditing(true)}
              disabled={loading}
              className="text-xs text-gray-600 hover:text-brand-600 border border-gray-200
                         hover:border-brand-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              Edit
            </button>

            {/* Mark Sold / Re-list */}
            <button
              onClick={handleToggleStatus}
              disabled={loading}
              className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${
                product.status === 'available'
                  ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                  : 'text-brand-600 border-brand-200 hover:bg-brand-50'
              }`}
            >
              {loading
                ? '…'
                : product.status === 'available'
                  ? 'Mark Sold'
                  : 'Re-list'
              }
            </button>

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
      )}
    </div>
  )
}

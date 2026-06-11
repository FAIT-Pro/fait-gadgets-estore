'use client'
// ── app/admin/dashboard/ProductActions.tsx ────────────────────────────────────
// One row in the admin product list. Works for all three statuses (draft / live / sold).
//
// Status-specific buttons:
//   Draft   → [Edit] [Publish] [Delete]
//   Live    → [Edit] [Unpublish] [Mark Sold] [Copy URL] [Delete]
//   Sold    → [Edit] [Re-list] [Delete]
//
// Inline edit form lets you update name / price / category / description
// without leaving the page.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import Image                from 'next/image'
import type { Product }     from '@/lib/supabase'
import ImagePickerModal     from '@/components/admin/ImagePickerModal'

const CATEGORIES = [
  'Fashion', 'Electronics', 'Food & Drinks',
  'Beauty', 'Home & Living', 'Other',
]

export default function ProductActions({
  product: initialProduct,
}: {
  product: Product
}) {
  const [product,      setProduct]      = useState(initialProduct)
  const [editing,      setEditing]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [deleted,      setDeleted]      = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [addingPhoto,  setAddingPhoto]  = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)

  // Edit form state
  const [name,         setName]         = useState(product.name)
  const [price,        setPrice]        = useState(product.price?.toString() || '')
  const [category,     setCategory]     = useState(product.category)
  const [description,  setDescription]  = useState(product.description || '')
  const [editImages,   setEditImages]   = useState<string[]>(
    product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])
  )

  const addPhotoRef = useRef<HTMLInputElement>(null)

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

  async function handleSave() {
    await patch({
      name,
      price:       price ? parseFloat(price) : null,
      category,
      description: description || null,
      image_url:   editImages[0] || null,
      image_urls:  editImages,
    })
    setEditing(false)
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || editImages.length >= 6) return
    setAddingPhoto(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res  = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) setEditImages(imgs => [...imgs, data.imageUrl])
    } catch { /* silent fail */ }
    setAddingPhoto(false)
    if (addPhotoRef.current) addPhotoRef.current.value = ''
  }

  function removeEditImage(idx: number) {
    setEditImages(imgs => imgs.filter((_, i) => i !== idx))
  }

  function handleLibrarySelect(url: string) {
    if (editImages.length < 6) setEditImages(imgs => [...imgs, url])
    setShowPicker(false)
  }

  async function handlePublish()   { await patch({ status: 'available' }) }
  async function handleUnpublish() { await patch({ status: 'draft' }) }
  async function handleMarkSold()  { await patch({ status: 'sold' }) }
  async function handleRelist()    { await patch({ status: 'available' }) }

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

  // Status badge config
  const badge = {
    available: { label: '● Live',   cls: 'bg-green-50 text-green-700 border border-green-100' },
    draft:     { label: '◐ Draft',  cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
    sold:      { label: '✓ Sold',   cls: 'bg-gray-100 text-gray-500' },
  }[product.status] ?? { label: product.status, cls: 'bg-gray-100 text-gray-500' }

  // Row opacity
  const rowOpacity = product.status === 'sold' ? 'opacity-50' : ''

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 transition-opacity ${rowOpacity}`}>

      {editing ? (
        /* ── EDIT FORM ──────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Price ({product.currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Leave blank if none"
                className="w-full border border-gray-200 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Product description…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* ── Image management ─────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Photos ({editImages.length}/6)
            </label>
            <div className="flex gap-2 flex-wrap">
              {editImages.map((url, idx) => (
                <div key={idx} className="relative group">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                    <Image src={url} alt={`Photo ${idx + 1}`} width={56} height={56}
                      className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => removeEditImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white
                               rounded-full text-xs flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                </div>
              ))}
              {editImages.length < 6 && (
                <>
                  {/* Upload new photo */}
                  <input ref={addPhotoRef} type="file" accept="image/*"
                    onChange={handleAddPhoto} className="hidden" id={`add-photo-${product.id}`} />
                  <label
                    htmlFor={`add-photo-${product.id}`}
                    title="Upload a new photo"
                    className={`w-14 h-14 rounded-lg border-2 border-dashed border-gray-200
                                flex items-center justify-center cursor-pointer
                                hover:border-brand-300 hover:bg-brand-50 transition-colors
                                ${addingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {addingPhoto
                      ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      : <span className="text-brand-500 text-xl font-light">+</span>
                    }
                  </label>

                  {/* Pick from image library */}
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    title="Pick from image library"
                    className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200
                               flex items-center justify-center cursor-pointer
                               hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
                         stroke="#16a34a" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21zm11.25-6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                    </svg>
                  </button>
                </>
              )}

              {/* Image library modal */}
              {showPicker && (
                <ImagePickerModal
                  onSelect={handleLibrarySelect}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          </div>

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
                setName(product.name)
                setPrice(product.price?.toString() || '')
                setCategory(product.category)
                setDescription(product.description || '')
                setEditImages(product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : []))
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

          {/* Action buttons — vary by status */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">

            {/* Edit — always shown */}
            <button
              onClick={() => setEditing(true)}
              disabled={loading}
              className="text-xs text-gray-600 hover:text-brand-600 border border-gray-200
                         hover:border-brand-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              Edit
            </button>

            {/* Draft: Publish */}
            {product.status === 'draft' && (
              <button
                onClick={handlePublish}
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
                  onClick={handleUnpublish}
                  disabled={loading}
                  className="text-xs text-amber-600 border border-amber-200
                             hover:bg-amber-50 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {loading ? '…' : 'Unpublish'}
                </button>
                <button
                  onClick={handleMarkSold}
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
                onClick={handleRelist}
                disabled={loading}
                className="text-xs text-brand-600 border border-brand-200
                           hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors"
              >
                {loading ? '…' : 'Re-list'}
              </button>
            )}

            {/* Delete — always shown */}
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

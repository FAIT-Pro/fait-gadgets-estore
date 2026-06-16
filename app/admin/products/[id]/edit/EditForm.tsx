'use client'
// ── app/admin/products/[id]/edit/EditForm.tsx ─────────────────────────────────
// Full-page edit form for an existing product.
// All fields pre-populated from the database.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef }  from 'react'
import Image                 from 'next/image'
import { useRouter }         from 'next/navigation'
import ImagePickerModal      from '@/components/admin/ImagePickerModal'
import type { Product }      from '@/lib/supabase'

const CATEGORIES = [
  'Fashion', 'Electronics', 'Food & Drinks',
  'Beauty', 'Home & Living', 'Other',
]

export default function EditForm({ product }: { product: Product }) {
  const router = useRouter()

  const [name,        setName]        = useState(product.name)
  const [price,       setPrice]       = useState(product.price?.toString() || '')
  const [currency,    setCurrency]    = useState(product.currency || 'NGN')
  const [category,    setCategory]    = useState(product.category)
  const [description, setDescription] = useState(product.description || '')
  const [images,      setImages]      = useState<string[]>(
    product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])
  )
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [showPicker,  setShowPicker]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const addPhotoRef = useRef<HTMLInputElement>(null)

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || images.length >= 6) return
    setAddingPhoto(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res  = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) setImages(imgs => [...imgs, data.imageUrl])
      else setError('Photo upload failed.')
    } catch {
      setError('Network error while uploading photo.')
    }
    setAddingPhoto(false)
    if (addPhotoRef.current) addPhotoRef.current.value = ''
  }

  function removeImage(idx: number) {
    setImages(imgs => imgs.filter((_, i) => i !== idx))
    if (selectedIdx >= idx && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
  }

  function handleLibrarySelect(url: string) {
    if (images.length >= 6) { setError('Maximum 6 photos per product.'); return }
    setImages(imgs => [...imgs, url])
    setShowPicker(false)
  }

  async function handleSave(status: string) {
    if (!name.trim()) { setError('Product name is required.'); return }
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        name.trim(),
          price:       price ? parseFloat(price) : null,
          currency,
          category,
          description: description.trim() || null,
          image_url:   images[0] || null,
          image_urls:  images,
          status,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || 'Failed to save.')
        setSaving(false)
        return
      }
      router.push('/admin/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

      {/* ── Photo section ────────────────────────────────────────────────────── */}
      <div>
        {images.length > 0 && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-sm mb-2">
            <Image
              src={images[selectedIdx] || images[0]}
              alt="Product photo"
              fill
              className="object-cover"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white
                              text-xs px-2 py-0.5 rounded-full">
                {selectedIdx + 1} / {images.length}
              </div>
            )}
          </div>
        )}

        {/* Thumbnail strip */}
        <div className="flex gap-2 flex-wrap">
          {images.map((src, idx) => (
            <div key={idx} className="relative group">
              <button
                onClick={() => setSelectedIdx(idx)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                  selectedIdx === idx ? 'border-brand-500' : 'border-transparent'
                }`}
              >
                <div className="relative w-full h-full">
                  <Image src={src} alt={`Photo ${idx + 1}`} fill className="object-cover" />
                </div>
              </button>
              {images.length > 1 && (
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white
                             rounded-full text-xs flex items-center justify-center
                             opacity-0 group-hover:opacity-100 transition-opacity"
                >×</button>
              )}
            </div>
          ))}

          {images.length < 6 && (
            <>
              <input
                ref={addPhotoRef}
                type="file"
                accept="image/*"
                onChange={handleAddPhoto}
                className="hidden"
                id="edit-add-photo"
              />
              <label
                htmlFor="edit-add-photo"
                title="Upload a new photo"
                className={`w-14 h-14 rounded-xl border-2 border-dashed border-gray-200
                            flex items-center justify-center cursor-pointer
                            hover:border-brand-300 hover:bg-brand-50 transition-colors
                            ${addingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {addingPhoto
                  ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  : <span className="text-brand-500 text-xl font-light">+</span>
                }
              </label>

              <button
                type="button"
                onClick={() => setShowPicker(true)}
                title="Pick from image library"
                className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200
                           flex items-center justify-center cursor-pointer
                           hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
                     stroke="#16a34a" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21zm11.25-6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {showPicker && (
          <ImagePickerModal
            onSelect={handleLibrarySelect}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      )}

      {/* ── Product Name ──────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* ── Price + Currency ──────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price <span className="text-gray-400 font-normal">(leave blank if negotiable)</span>
        </label>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(['NGN', 'USD'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  currency === c
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c === 'NGN' ? '₦ NGN' : '$ USD'}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* ── Category ──────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Description ───────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe your product…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{description.length} characters</p>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 pb-10">
        <button
          onClick={() => router.push('/admin/dashboard')}
          disabled={saving}
          className="btn-ghost py-3 px-5 rounded-xl text-sm"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="flex-1 btn-ghost py-3 rounded-xl text-sm"
        >
          {saving ? 'Saving…' : '💾 Save as Draft'}
        </button>
        <button
          onClick={() => handleSave('available')}
          disabled={saving}
          className="flex-1 btn-primary py-3 rounded-xl text-sm"
        >
          {saving ? 'Publishing…' : '🚀 Publish'}
        </button>
      </div>
    </div>
  )
}

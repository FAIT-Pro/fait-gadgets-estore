'use client'
// ── app/admin/products/new/UploadForm.tsx ─────────────────────────────────────
// Three-stage product upload form:
//   1. UPLOAD   → seller taps to take/choose the first photo
//   2. ANALYZING → Cloudinary + Gemini run in parallel
//   3. FORM     → fields pre-filled by AI, seller can add more photos, then save
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef }  from 'react'
import Image                 from 'next/image'
import { useRouter }         from 'next/navigation'
import ImagePickerModal      from '@/components/admin/ImagePickerModal'

const CATEGORIES = [
  'Fashion', 'Electronics', 'Food & Drinks',
  'Beauty', 'Home & Living', 'Other',
]

type Stage = 'upload' | 'analyzing' | 'form' | 'saving'

type ProductDraft = {
  imageUrls:   string[]   // all uploaded images (first = primary)
  name:        string
  description: string
  price:       string
  currency:    string
  category:    string
}

const EMPTY: ProductDraft = {
  imageUrls:   [],
  name:        '',
  description: '',
  price:       '',
  currency:    'NGN',
  category:    'Other',
}

export default function UploadForm() {
  const [stage,        setStage]        = useState<Stage>('upload')
  const [previews,     setPreviews]     = useState<string[]>([])  // local object URLs
  const [draft,        setDraft]        = useState<ProductDraft>(EMPTY)
  const [error,        setError]        = useState<string>('')
  const [addingPhoto,  setAddingPhoto]  = useState(false)  // spinner for extra uploads
  const [selectedIdx,  setSelectedIdx]  = useState(0)      // which thumbnail is shown large
  const [showPicker,   setShowPicker]   = useState(false)  // image library modal

  const fileRef      = useRef<HTMLInputElement>(null)
  const extraFileRef = useRef<HTMLInputElement>(null)
  const router       = useRouter()

  // ── Step 1: First photo → triggers AI analysis ────────────────────────────
  async function handleFirstPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const localPreview = URL.createObjectURL(file)
    setPreviews([localPreview])
    setStage('analyzing')
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res  = await fetch('/api/admin/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError('AI could not read the image. Please fill in the details below.')
        setDraft({ ...EMPTY })
      } else {
        setDraft({
          imageUrls:   [data.imageUrl],
          name:        data.name        || '',
          description: data.description || '',
          price:       data.price != null ? String(data.price) : '',
          currency:    data.currency    || 'NGN',
          category:    data.category    || 'Other',
        })
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
      setDraft({ ...EMPTY })
    }

    setStage('form')
  }

  // ── Extra photos (no Gemini — just Cloudinary) ────────────────────────────
  async function handleExtraPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (draft.imageUrls.length >= 6) {
      setError('Maximum 6 photos per product.')
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreviews(p => [...p, localPreview])
    setAddingPhoto(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res  = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        // Remove the local preview we just added
        setPreviews(p => p.slice(0, -1))
        setError('Photo upload failed. Please try again.')
      } else {
        setDraft(d => ({ ...d, imageUrls: [...d.imageUrls, data.imageUrl] }))
      }
    } catch {
      setPreviews(p => p.slice(0, -1))
      setError('Network error while uploading photo.')
    }

    setAddingPhoto(false)
    // Reset so same file can be picked again
    if (extraFileRef.current) extraFileRef.current.value = ''
  }

  // ── Remove a photo from the list ─────────────────────────────────────────
  function removePhoto(idx: number) {
    setPreviews(p  => p.filter((_, i) => i !== idx))
    setDraft(d => ({ ...d, imageUrls: d.imageUrls.filter((_, i) => i !== idx) }))
    if (selectedIdx >= idx && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
  }

  // ── Pick an existing image from the library ───────────────────────────────
  // On upload stage: goes straight to form with that image (no AI analysis).
  // On form stage:   appends to the current photo strip.
  function handleLibrarySelect(url: string) {
    if (stage === 'upload') {
      setDraft({ ...EMPTY, imageUrls: [url] })
      setPreviews([url])
      setStage('form')
    } else {
      if (draft.imageUrls.length >= 6) { setError('Maximum 6 photos per product.'); return }
      setDraft(d => ({ ...d, imageUrls: [...d.imageUrls, url] }))
      setPreviews(p => [...p, url])
    }
    setShowPicker(false)
  }

  // ── Save product ──────────────────────────────────────────────────────────
  async function handleSave(status: 'draft' | 'available') {
    if (!draft.name.trim()) {
      setError('Please enter a product name.')
      return
    }

    setStage('saving')
    setError('')

    try {
      const res = await fetch('/api/admin/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...draft, status }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to save. Please try again.')
        setStage('form')
        return
      }

      router.push('/admin/dashboard')

    } catch {
      setError('Network error. Please try again.')
      setStage('form')
    }
  }

  function handleReset() {
    setStage('upload')
    setPreviews([])
    setDraft(EMPTY)
    setError('')
    setSelectedIdx(0)
    if (fileRef.current)      fileRef.current.value = ''
    if (extraFileRef.current) extraFileRef.current.value = ''
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE: UPLOAD
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === 'upload') {
    return (
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFirstPhoto}
          className="hidden"
          id="photo-input"
        />
        <label
          htmlFor="photo-input"
          className="flex flex-col items-center justify-center
                     border-2 border-dashed border-brand-300 dark:border-brand-700 rounded-2xl
                     bg-white dark:bg-gray-900 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20
                     transition-colors p-10 text-center"
        >
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center mb-4">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">Tap to take a photo</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">or choose from your gallery</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-4">AI will automatically read the product details</p>
        </label>

        {/* Library picker link */}
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">or </span>
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
          >
            📁 pick from your image library
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">Supported: JPG, PNG, WEBP · Max 6 photos per product</p>

        {showPicker && (
          <ImagePickerModal
            onSelect={handleLibrarySelect}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE: ANALYZING
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === 'analyzing') {
    return (
      <div className="space-y-6">
        {previews[0] && (
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm">
            <Image src={previews[0]} alt="Uploading…" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white font-medium text-sm">AI is reading your product…</p>
            </div>
          </div>
        )}
        <div className="space-y-3 animate-pulse">
          {[80, 60, 100, 50].map((w, i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE: FORM (and SAVING)
  // ──────────────────────────────────────────────────────────────────────────
  const displayPreviews = previews.length > 0 ? previews : draft.imageUrls

  return (
    <div className="space-y-5">

      {/* ── Photo gallery ──────────────────────────────────────────────────── */}
      <div>
        {/* Main large photo */}
        {displayPreviews.length > 0 && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm mb-2">
            <Image
              src={displayPreviews[selectedIdx] || displayPreviews[0]}
              alt="Product photo"
              fill
              className="object-cover"
            />
            {displayPreviews.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white
                              text-xs px-2 py-0.5 rounded-full">
                {selectedIdx + 1} / {displayPreviews.length}
              </div>
            )}
          </div>
        )}

        {/* Thumbnail strip */}
        {displayPreviews.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {displayPreviews.map((src, idx) => (
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
                {/* Remove button */}
                {displayPreviews.length > 1 && (
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white
                               rounded-full text-xs flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {/* Add more photos: upload new OR pick from library */}
            {draft.imageUrls.length < 6 && (
              <>
                {/* Upload new photo */}
                <input
                  ref={extraFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleExtraPhoto}
                  className="hidden"
                  id="extra-photo-input"
                />
                <label
                  htmlFor="extra-photo-input"
                  title="Upload a new photo"
                  className={`w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700
                              flex items-center justify-center cursor-pointer
                              hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors
                              ${addingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {addingPhoto ? (
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
                      stroke="#16a34a" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                    </svg>
                  )}
                </label>

                {/* Pick from library */}
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  title="Pick from image library"
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700
                             flex items-center justify-center cursor-pointer
                             hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
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
        )}

        {draft.imageUrls.length < 6 && (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="font-medium">+</span> upload new &nbsp;·&nbsp;
            <span className="font-medium">⊞</span> pick from library
          </p>
        )}

        <button
          onClick={handleReset}
          className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          Start over with a different photo
        </button>

        {/* Image library modal */}
        {showPicker && (
          <ImagePickerModal
            onSelect={handleLibrarySelect}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      {/* ── AI notice ──────────────────────────────────────────────────────── */}
      {!error && draft.name && (
        <div className="flex items-start gap-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl px-3 py-2">
          <span className="text-brand-600 dark:text-brand-400 text-sm">✨</span>
          <p className="text-xs text-brand-700 dark:text-brand-400">
            AI filled in these details from your photo. Review and edit anything before saving.
          </p>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── Product Name ───────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Product Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Samsung Galaxy Buds Pro"
          className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800
                     dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* ── Price + Currency ───────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Price <span className="text-gray-400 font-normal">(leave blank if negotiable)</span>
        </label>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['NGN', 'USD'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft(d => ({ ...d, currency: c }))}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  draft.currency === c
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
            value={draft.price}
            onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}
            placeholder="0.00"
            className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800
                       dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* ── Category ───────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <select
          value={draft.category}
          onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 dark:text-gray-100"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Description ────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
          rows={4}
          placeholder="Describe your product — features, condition, what's included…"
          className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800
                     dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{draft.description.length} characters</p>
      </div>

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 pb-8">
        <button
          onClick={() => handleSave('draft')}
          disabled={stage === 'saving'}
          className="flex-1 btn-ghost py-3 rounded-xl text-sm"
        >
          {stage === 'saving' ? 'Saving…' : '💾 Save as Draft'}
        </button>
        <button
          onClick={() => handleSave('available')}
          disabled={stage === 'saving'}
          className="flex-1 btn-primary py-3 rounded-xl text-sm"
        >
          {stage === 'saving' ? 'Publishing…' : '🚀 Publish Now'}
        </button>
      </div>

    </div>
  )
}

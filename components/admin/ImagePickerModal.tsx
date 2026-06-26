'use client'
// ── components/admin/ImagePickerModal.tsx ─────────────────────────────────────
// Full-screen modal that shows all images already in the database.
// The seller can tap any image to reuse it instead of re-uploading.
//
// Usage:
//   <ImagePickerModal onSelect={(url) => doSomethingWith(url)} onClose={() => setShow(false)} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Image                   from 'next/image'

type Props = {
  onSelect: (url: string) => void
  onClose:  () => void
}

export default function ImagePickerModal({ onSelect, onClose }: Props) {
  const [images,  setImages]  = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/admin/images')
      .then(r => r.json())
      .then(d => {
        if (d.ok) setImages(d.images)
        else setError('Could not load image library.')
      })
      .catch(() => setError('Network error — could not load images.'))
      .finally(() => setLoading(false))
  }, [])

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">

      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-lg
                      flex flex-col shadow-2xl"
           style={{ maxHeight: '85vh' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">Image Library</h3>
            {!loading && images.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {images.length} photo{images.length !== 1 ? 's' : ''} — tap to add
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                       flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-4">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Loading library…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button
                onClick={() => { setError(''); setLoading(true);
                  fetch('/api/admin/images').then(r => r.json())
                    .then(d => { if (d.ok) setImages(d.images); else setError('Still failing.') })
                    .catch(() => setError('Still failing.'))
                    .finally(() => setLoading(false))
                }}
                className="text-xs text-brand-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && images.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"
                     stroke="#9ca3af" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21zm11.25-6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Library is empty</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Upload your first product to start building a library.</p>
            </div>
          )}

          {!loading && !error && images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(url)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800
                             border-2 border-transparent hover:border-brand-500
                             focus:outline-none focus:border-brand-500
                             transition-all group"
                  aria-label={`Select image ${idx + 1}`}
                >
                  <Image
                    src={url}
                    alt={`Library image ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="(max-width: 512px) 33vw, 170px"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/20
                                  transition-colors flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-white shadow-md
                                    flex items-center justify-center
                                    opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                           stroke="#16a34a" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

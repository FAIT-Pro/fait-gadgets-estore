'use client'
// ── components/ImageGallery.tsx ───────────────────────────────────────────────
// Shows multiple product photos on the product detail page.
// Large main image on top, clickable thumbnail strip below.
// Falls back gracefully when only one image exists.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Image        from 'next/image'

type Props = {
  images:      string[]   // all image URLs (first = primary)
  productName: string
  isSold?:     boolean
}

export default function ImageGallery({ images, productName, isSold }: Props) {
  const [selected, setSelected] = useState(0)

  if (images.length === 0) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm mb-5
                      flex items-center justify-center text-gray-300 dark:text-gray-600">
        <svg width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="mb-5">

      {/* ── Main image ────────────────────────────────────────────────────── */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm mb-3">
        <Image
          src={images[selected]}
          alt={`${productName} — photo ${selected + 1}`}
          fill
          className="object-cover transition-opacity duration-200"
          sizes="(max-width: 672px) 100vw, 672px"
          priority
        />

        {/* Photo counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white
                          text-xs font-medium px-2.5 py-1 rounded-full">
            {selected + 1} / {images.length}
          </div>
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-2xl tracking-wide">SOLD</span>
          </div>
        )}
      </div>

      {/* ── Thumbnail strip (only shown when 2+ images) ─────────────────── */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all
                          ${idx === selected
                            ? 'border-brand-500 shadow-sm'
                            : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
              aria-label={`View photo ${idx + 1}`}
            >
              <Image
                src={src}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

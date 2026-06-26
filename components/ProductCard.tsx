'use client'
// ── components/ProductCard.tsx ────────────────────────────────────────────────
// A single product tile in the store grid.
// Shows the product image, name, price, category badge,
// and Like / Save buttons that notify you on WhatsApp.
// ─────────────────────────────────────────────────────────────────────────────

import Image from 'next/image'
import Link  from 'next/link'
import { useState, useEffect } from 'react'
import type { Product } from '@/lib/supabase'

// ── Utility: get or create a random visitor ID ────────────────────────────────
// Each browser gets a unique ID so we can track interactions per visitor.
function getVisitorId(): string {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('visitor_id', id)
  }
  return id
}

// ── Track an interaction with the server ──────────────────────────────────────
async function trackInteraction(
  productId: string,
  productName: string,
  type: 'view' | 'like' | 'save' | 'enquiry'
) {
  await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId,
      productName,
      type,
      visitorId: getVisitorId(),
    }),
  })
}

// ── Category colors ───────────────────────────────────────────────────────────
const categoryStyle: Record<string, string> = {
  'Fashion':       'bg-pink-100 text-pink-700',
  'Electronics':   'bg-blue-100 text-blue-700',
  'Food & Drinks': 'bg-orange-100 text-orange-700',
  'Beauty':        'bg-purple-100 text-purple-700',
  'Home & Living': 'bg-teal-100 text-teal-700',
  'Other':         'bg-gray-100 text-gray-600',
}

// ── The Component ─────────────────────────────────────────────────────────────
type Props = { product: Product }

export default function ProductCard({ product }: Props) {
  const [liked,   setLiked]   = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [tracked, setTracked] = useState(false)

  const catStyle = categoryStyle[product.category] || categoryStyle['Other']

  // Track a view the first time this card loads on screen
  useEffect(() => {
    if (!tracked) {
      trackInteraction(product.id, product.name, 'view')
      setTracked(true)
    }
  }, [tracked, product.id, product.name])

  // Persist like/save state across page refreshes
  useEffect(() => {
    setLiked(!!localStorage.getItem(`liked_${product.id}`))
    setSaved(!!localStorage.getItem(`saved_${product.id}`))
  }, [product.id])

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()   // Don't navigate to product page
    const next = !liked
    setLiked(next)
    next
      ? localStorage.setItem(`liked_${product.id}`, '1')
      : localStorage.removeItem(`liked_${product.id}`)
    if (next) await trackInteraction(product.id, product.name, 'like')
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next = !saved
    setSaved(next)
    next
      ? localStorage.setItem(`saved_${product.id}`, '1')
      : localStorage.removeItem(`saved_${product.id}`)
    if (next) await trackInteraction(product.id, product.name, 'save')
  }

  const formattedPrice = product.price
    ? `${product.currency === 'NGN' ? '₦' : '$'}${Number(product.price).toLocaleString()}`
    : 'Ask for price'

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm
                      hover:shadow-md transition-shadow duration-200 border border-gray-100 dark:border-gray-800">

        {/* ── Product Image ─────────────────────────────────────────── */}
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          )}

          {/* ── Like / Save buttons floating over image ──────────────── */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <button
              onClick={handleLike}
              aria-label="Like product"
              className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full
                         flex items-center justify-center shadow-sm
                         hover:bg-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"
                fill={liked ? '#e11d48' : 'none'}
                stroke={liked ? '#e11d48' : '#6b7280'}
                strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
            <button
              onClick={handleSave}
              aria-label="Save product"
              className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full
                         flex items-center justify-center shadow-sm
                         hover:bg-white transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24"
                fill={saved ? '#0369a1' : 'none'}
                stroke={saved ? '#0369a1' : '#6b7280'}
                strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Product Info ──────────────────────────────────────────── */}
        <div className="p-3">
          <span className={`badge text-[10px] mb-1 ${catStyle}`}>
            {product.category}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {product.name}
          </h3>
          <p className="price-tag mt-1 text-base">
            {formattedPrice}
          </p>
        </div>
      </div>
    </Link>
  )
}

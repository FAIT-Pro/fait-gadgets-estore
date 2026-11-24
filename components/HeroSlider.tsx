'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/lib/supabase'

type Props = {
  products: Product[]
}

function priceLabel(product: Product): string {
  if (!product.price) return 'Price on enquiry'
  const symbol = product.currency === 'NGN' ? '₦' : '$'
  return `${symbol}${Number(product.price).toLocaleString()}`
}

export default function HeroSlider({ products }: Props) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (paused || products.length < 2) return
    const timer = window.setInterval(() => {
      setActive(current => (current + 1) % products.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [paused, products.length])

  if (products.length === 0) return null

  function goPrevious() {
    setActive(current => (current + products.length - 1) % products.length)
  }

  function goNext() {
    setActive(current => (current + 1) % products.length)
  }

  return (
    <section
      className="mb-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="relative h-72 sm:h-96 md:h-[420px] overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-sm"
        onTouchStart={event => { touchStartX.current = event.touches[0].clientX }}
        onTouchEnd={event => {
          if (touchStartX.current === null) return
          const distance = event.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(distance) > 40) {
            if (distance < 0) goNext()
            else goPrevious()
          }
          touchStartX.current = null
        }}
      >
        {products.map((product, index) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            aria-hidden={index !== active}
            tabIndex={index === active ? 0 : -1}
            className={`absolute inset-0 block transition-opacity duration-700
              ${index === active ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'}`}
          >
            {product.image_url && (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-8">
              <span className="badge mb-2 bg-white/20 text-white">{product.category}</span>
              <h2 className="text-xl font-bold leading-tight drop-shadow sm:text-3xl">{product.name}</h2>
              <p className="mt-1 text-lg font-semibold sm:text-2xl">{priceLabel(product)}</p>
              <span className="mt-3 inline-flex items-center text-sm font-medium">View product →</span>
            </div>
          </Link>
        ))}

        {products.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrevious}
              aria-label="Previous product"
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white hover:bg-black/60"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next product"
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white hover:bg-black/60"
            >
              ›
            </button>
            <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
              {products.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show product ${index + 1}`}
                  className={`h-2 rounded-full transition-all
                    ${index === active ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

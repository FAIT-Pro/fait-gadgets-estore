// ── app/product/[id]/page.tsx ─────────────────────────────────────────────────
// The full product page a visitor sees when they click a product card.
// Shows the full image, description, price, and an "Enquire" button
// that opens the Tawk.to live chat for them to message you.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase }       from '@/lib/supabase'
import Image              from 'next/image'
import Link               from 'next/link'
import { notFound }       from 'next/navigation'
import EnquireButton      from '@/components/EnquireButton'
import type { Metadata }  from 'next'
import type { Product }   from '@/lib/supabase'

export const revalidate = 60

// ── Dynamic SEO title/description for each product ───────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const { data } = await supabase.from('products').select('name, description').eq('id', params.id).single()
  if (!data) return { title: 'Product Not Found' }
  return {
    title: `${data.name} | ${process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'}`,
    description: data.description || undefined,
  }
}

// ── Category badge colors ──────────────────────────────────────────────────
const categoryStyle: Record<string, string> = {
  'Fashion':       'bg-pink-100 text-pink-700',
  'Electronics':   'bg-blue-100 text-blue-700',
  'Food & Drinks': 'bg-orange-100 text-orange-700',
  'Beauty':        'bg-purple-100 text-purple-700',
  'Home & Living': 'bg-teal-100 text-teal-700',
  'Other':         'bg-gray-100 text-gray-600',
}

export default async function ProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  const p = product as Product
  const catStyle = categoryStyle[p.category] || categoryStyle['Other']
  const formattedPrice = p.price
    ? `${p.currency === 'NGN' ? '₦' : '$'}${Number(p.price).toLocaleString()}`
    : 'Price on enquiry'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navigation bar ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-800 truncate">{p.name}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Product image ────────────────────────────────────────────────── */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm mb-5">
          {p.image_url ? (
            <Image
              src={p.image_url}
              alt={p.name}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <svg width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          )}

          {/* Sold banner */}
          {p.status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-2xl tracking-wide">SOLD</span>
            </div>
          )}
        </div>

        {/* ── Product details card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className={`badge text-xs mb-2 ${catStyle}`}>{p.category}</span>
              <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-brand-700">{formattedPrice}</p>
              {p.status === 'available' && (
                <span className="text-xs text-green-600 font-medium">✓ Available</span>
              )}
            </div>
          </div>

          {p.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              {p.description}
            </p>
          )}

          {/* ── Action buttons ──────────────────────────────────────────────── */}
          <div className="flex gap-3">
            {p.status === 'available' ? (
              <EnquireButton productId={p.id} productName={p.name} />
            ) : (
              <div className="flex-1 text-center py-3 bg-gray-100 rounded-xl text-gray-400 font-medium">
                This item has been sold
              </div>
            )}
          </div>
        </div>

        {/* ── Back to store link ──────────────────────────────────────────── */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            ← Browse more products
          </Link>
        </div>
      </main>
    </div>
  )
}

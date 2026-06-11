// ── app/product/[id]/page.tsx ─────────────────────────────────────────────────
// Full product page — image gallery, description, price, enquire button.
// Uses supabaseAdmin so sold products show a SOLD overlay instead of 404.
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin }  from '@/lib/supabase'
import Link               from 'next/link'
import { notFound }       from 'next/navigation'
import EnquireButton      from '@/components/EnquireButton'
import ImageGallery       from '@/components/ImageGallery'
import type { Metadata }  from 'next'
import type { Product }   from '@/lib/supabase'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const { data } = await supabaseAdmin.from('products').select('name, description').eq('id', params.id).single()
  if (!data) return { title: 'Product Not Found' }
  return {
    title: `${data.name} | ${process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'}`,
    description: data.description || undefined,
  }
}

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
  // Use supabaseAdmin so sold/draft products are accessible (fixes the 404 bug for sold items)
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  const p = product as Product

  // Build the images array — use image_urls if available, else fall back to image_url
  const images: string[] = (p.image_urls && p.image_urls.length > 0)
    ? p.image_urls
    : (p.image_url ? [p.image_url] : [])

  const catStyle       = categoryStyle[p.category] || categoryStyle['Other']
  const formattedPrice = p.price
    ? `${p.currency === 'NGN' ? '₦' : '$'}${Number(p.price).toLocaleString()}`
    : 'Price on enquiry'

  // Don't show draft products to the public
  if (p.status === 'draft') notFound()

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

        {/* ── Image gallery ─────────────────────────────────────────────────── */}
        <ImageGallery
          images={images}
          productName={p.name}
          isSold={p.status === 'sold'}
        />

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
            <p className="text-gray-600 text-sm leading-relaxed mb-5">{p.description}</p>
          )}

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

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            ← Browse more products
          </Link>
        </div>
      </main>
    </div>
  )
}

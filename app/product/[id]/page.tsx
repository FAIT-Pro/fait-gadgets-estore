// ── app/product/[id]/page.tsx ─────────────────────────────────────────────────
// Full product page — image gallery, description, price, enquire button.
// Uses supabaseAdmin so sold products show a SOLD overlay instead of 404.
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin }  from '@/lib/supabase'
import Link               from 'next/link'
import { notFound }       from 'next/navigation'
import EnquireButton      from '@/components/EnquireButton'
import ImageGallery       from '@/components/ImageGallery'
import ProductCard        from '@/components/ProductCard'
import PolicyModal        from '@/components/PolicyModal'
import ThemeToggle        from '@/components/ThemeToggle'
import type { Metadata }  from 'next'
import type { Product }   from '@/lib/supabase'

export const revalidate = 600

const DELIVERY_POLICY = [
  'Orders are confirmed after the seller contacts you.',
  'Delivery within Lagos is arranged directly with the seller; nationwide delivery is available by arrangement.',
  'Delivery fees and timelines are confirmed before payment.',
]

const RETURN_POLICY = [
  'Please inspect your item on delivery.',
  'Report damaged or wrong items within 24 hours.',
  'Returns are accepted only for faulty or incorrect items, subject to seller approval.',
]

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

function formatPrice(product: Product): string {
  if (!product.price) return 'Price on enquiry'
  const symbol = product.currency === 'NGN' ? '₦' : '$'
  return `${symbol}${Number(product.price).toLocaleString()}`
}

export default async function ProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  const p = product as Product

  if (p.status === 'draft') notFound()

  const images: string[] = (p.image_urls && p.image_urls.length > 0)
    ? p.image_urls
    : (p.image_url ? [p.image_url] : [])

  const catStyle = categoryStyle[p.category] || categoryStyle['Other']
  const formattedPrice = formatPrice(p)
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'
  const sellerPhone = process.env.NEXT_PUBLIC_SELLER_PHONE
  const sellerWhatsapp = process.env.NEXT_PUBLIC_SELLER_WHATSAPP
  const sellerAddress = process.env.NEXT_PUBLIC_SELLER_ADDRESS
  const sellerHours = process.env.NEXT_PUBLIC_SELLER_HOURS

  let related: Product[] = []

  const { data: sameCategory } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('status', 'available')
    .eq('category', p.category)
    .neq('id', p.id)
    .order('updated_at', { ascending: false })
    .limit(4)

  related = (sameCategory || []) as Product[]

  if (related.length === 0) {
    const { data: recent } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('status', 'available')
      .neq('id', p.id)
      .order('updated_at', { ascending: false })
      .limit(4)
    related = (recent || []) as Product[]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Back to products">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/" className="hidden text-xs text-gray-400 hover:text-brand-600 sm:block dark:text-gray-500">
            {storeName}
          </Link>
          <ThemeToggle />
          <div className="min-w-0 flex-1 text-right">
            <h1 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{p.name}</h1>
            <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">{p.category}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">

        <ImageGallery
          images={images}
          productName={p.name}
          isSold={p.status === 'sold'}
        />

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <span className={`badge mb-2 text-xs ${catStyle}`}>{p.category}</span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{p.name}</h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-brand-700 dark:text-brand-500">{formattedPrice}</p>
              {p.status === 'available' && (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Available</span>
              )}
            </div>
          </div>

          {p.description && (
            <p className="mb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{p.description}</p>
          )}

          {p.status === 'available' ? (
            <EnquireButton
              productId={p.id}
              productName={p.name}
              formattedPrice={formattedPrice}
              sellerPhone={sellerPhone}
              sellerWhatsapp={sellerWhatsapp}
            />
          ) : (
            <div className="flex-1 rounded-xl bg-gray-100 py-3 text-center font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              This item has been sold
            </div>
          )}

          {(sellerAddress || sellerHours) && (
            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
              <h3 className="mb-2 font-semibold text-gray-800 dark:text-gray-100">Seller information</h3>
              {sellerAddress && (
                <p className="text-gray-600 dark:text-gray-300">📍 {sellerAddress}</p>
              )}
              {sellerHours && (
                <p className="mt-1 text-gray-600 dark:text-gray-300">🕒 {sellerHours}</p>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <PolicyModal label="Delivery Arrangement" title="Delivery Arrangement" body={DELIVERY_POLICY} />
            <PolicyModal label="Return Policy" title="Return Policy" body={RETURN_POLICY} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Similar products
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
              {related.map(item => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            ← Browse more products
          </Link>
        </div>
      </main>
    </div>
  )
}

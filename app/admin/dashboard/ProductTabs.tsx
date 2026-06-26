'use client'
// ── app/admin/dashboard/ProductTabs.tsx ───────────────────────────────────────
// Tab switcher for the admin dashboard.
// Three tabs: Live, Drafts, Sold — each shows its own product list.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }     from 'react'
import type { Product } from '@/lib/supabase'
import ProductActions   from './ProductActions'

type Tab = 'live' | 'drafts' | 'sold'

export default function ProductTabs({
  live,
  drafts,
  sold,
}: {
  live:   Product[]
  drafts: Product[]
  sold:   Product[]
}) {
  const [tab, setTab] = useState<Tab>('live')

  const tabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'live',   label: 'Live',   count: live.length,   color: 'text-brand-600' },
    { id: 'drafts', label: 'Drafts', count: drafts.length, color: 'text-amber-600' },
    { id: 'sold',   label: 'Sold',   count: sold.length,   color: 'text-gray-400'  },
  ]

  const current = tab === 'live' ? live : tab === 'drafts' ? drafts : sold

  const emptyMessages: Record<Tab, { icon: string; title: string; sub: string }> = {
    live:   { icon: '🛍️', title: 'No live products',  sub: 'Publish a draft to make it visible on the storefront.' },
    drafts: { icon: '📝', title: 'No drafts saved',   sub: 'When you save a product without publishing, it appears here.' },
    sold:   { icon: '✅', title: 'No sold items yet', sub: 'Mark a live product as sold and it moves here.' },
  }

  return (
    <div>
      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg
                        px-3 py-2 text-sm font-medium transition-all
                        ${tab === t.id
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
          >
            <span>{t.label}</span>
            <span
              className={`text-xs font-bold tabular-nums ${
                tab === t.id ? t.color : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Product list ─────────────────────────────────────────────────────── */}
      {current.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">{emptyMessages[tab].icon}</p>
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">
            {emptyMessages[tab].title}
          </p>
          <p className="text-sm mt-1">{emptyMessages[tab].sub}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {current.map(product => (
            <ProductActions key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

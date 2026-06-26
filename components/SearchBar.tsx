'use client'
// ── components/SearchBar.tsx ──────────────────────────────────────────────────
// Live search input — updates the URL search param on every keystroke (debounced
// 300ms) which triggers a server re-render without a full page navigation.
// ─────────────────────────────────────────────────────────────────────────────

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTransition, useCallback, useRef }       from 'react'

export default function SearchBar() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const [isPending, startTransition] = useTransition()
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set('q', value)
        } else {
          params.delete('q')
        }
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`)
        })
      }, 300)
    },
    [searchParams, router, pathname]
  )

  return (
    <div className="relative flex items-center">
      <input
        name="q"
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={handleChange}
        placeholder="Search products…"
        className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800
                   dark:text-gray-100 dark:placeholder-gray-500 rounded-lg px-3 py-1.5 pr-8
                   focus:outline-none focus:ring-2 focus:ring-brand-500 w-36 md:w-52"
      />
      {isPending && (
        <div className="absolute right-2.5 w-3.5 h-3.5 border-2 border-brand-400
                        border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

type Props = {
  label: string
  title: string
  body: string[]
}

export default function PolicyModal({ label, title, body }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {body.map(item => {
                if (item.startsWith('## ')) {
                  return (
                    <h3 key={item} className="pt-1 text-sm font-bold text-gray-900 dark:text-white">
                      {item.slice(3)}
                    </h3>
                  )
                }

                if (item.startsWith('! ')) {
                  return (
                    <p key={item} className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                      {item.slice(2)}
                    </p>
                  )
                }

                return (
                  <p key={item} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span>{item}</span>
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

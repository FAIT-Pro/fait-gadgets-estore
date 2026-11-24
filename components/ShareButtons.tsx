'use client'

import { useEffect, useState } from 'react'

type Props = {
  productName: string
}

export default function ShareButtons({ productName }: Props) {
  const [url, setUrl] = useState(process.env.NEXT_PUBLIC_SITE_URL || '')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url })
      } catch {
        return
      }
    } else {
      await copyLink()
    }
  }

  const encodedUrl = encodeURIComponent(url)

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
      >
        Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(productName)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
      >
        X
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button
        type="button"
        onClick={share}
        className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
      >
        Share
      </button>
    </div>
  )
}

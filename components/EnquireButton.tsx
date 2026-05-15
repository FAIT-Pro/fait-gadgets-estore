'use client'
// ── components/EnquireButton.tsx ──────────────────────────────────────────────
// When a visitor clicks "Enquire / Buy", this button:
//   1. Logs the enquiry interaction (so you get notified on WhatsApp)
//   2. Opens the Tawk.to live chat widget for them to message you
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

type Props = {
  productId:   string
  productName: string
}

declare global {
  interface Window {
    // Tawk.to exposes a global API object we can call
    Tawk_API?: { toggle?: () => void; maximize?: () => void }
  }
}

export default function EnquireButton({ productId, productName }: Props) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const handleEnquire = async () => {
    setLoading(true)

    // Track the enquiry
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        productName,
        type: 'enquiry',
        visitorId: localStorage.getItem('visitor_id'),
      }),
    })

    // Open the Tawk.to chat window
    if (window.Tawk_API?.maximize) {
      window.Tawk_API.maximize()
    } else if (window.Tawk_API?.toggle) {
      window.Tawk_API.toggle()
    }

    setLoading(false)
    setDone(true)
  }

  return (
    <button
      onClick={handleEnquire}
      disabled={loading}
      className="flex-1 btn-primary py-3 rounded-xl text-base flex items-center justify-center gap-2"
    >
      {loading ? (
        <span>Opening chat…</span>
      ) : done ? (
        <span>💬 Chat is open!</span>
      ) : (
        <>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          Enquire / Buy
        </>
      )}
    </button>
  )
}

'use client'
// ── components/EnquireButton.tsx ──────────────────────────────────────────────
// "Request to Buy" button — opens a modal where the visitor leaves their name
// and phone number. The seller is notified and contacts them directly.
// The Tawk.to chat widget remains available for general questions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }       from 'react'
import BuyRequestModal    from '@/components/BuyRequestModal'

type Props = {
  productId:    string
  productName:  string
  formattedPrice: string
}

declare global {
  interface Window {
    Tawk_API?: { toggle?: () => void; maximize?: () => void }
  }
}

export default function EnquireButton({ productId, productName, formattedPrice }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {/* Primary CTA — opens Request to Buy modal */}
      <button
        onClick={() => setShowModal(true)}
        className="flex-1 btn-primary py-3 rounded-xl text-base flex items-center justify-center gap-2"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        Request to Buy
      </button>

      {/* Secondary — opens Tawk.to chat for quick questions */}
      <button
        onClick={() => {
          if (window.Tawk_API?.maximize) window.Tawk_API.maximize()
          else if (window.Tawk_API?.toggle) window.Tawk_API.toggle()
        }}
        title="Chat with us"
        className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500
                   hover:border-brand-300 hover:text-brand-600 transition-colors"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8
               a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3
               13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </button>

      {showModal && (
        <BuyRequestModal
          productId={productId}
          productName={productName}
          price={formattedPrice}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import BuyRequestModal from '@/components/BuyRequestModal'
import ShareButtons from '@/components/ShareButtons'

type Props = {
  productId:      string
  productName:    string
  formattedPrice: string
  sellerPhone?:   string
  sellerWhatsapp?: string
}

declare global {
  interface Window {
    Tawk_API?: { toggle?: () => void; maximize?: () => void }
  }
}

export default function EnquireButton({
  productId,
  productName,
  formattedPrice,
  sellerPhone,
  sellerWhatsapp,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [phoneRevealed, setPhoneRevealed] = useState(false)

  const whatsappDigits = (sellerWhatsapp || '').replace(/\D/g, '')
  const whatsappHref = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    `Hello, I'm interested in ${productName} (${formattedPrice}).`
  )}`

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm sm:text-base"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Request to Buy
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.Tawk_API?.maximize) window.Tawk_API.maximize()
            else if (window.Tawk_API?.toggle) window.Tawk_API.toggle()
          }}
          title="Chat with us"
          aria-label="Chat with us"
          className="flex items-center justify-center rounded-xl border border-gray-200 px-3 py-3 text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-600 dark:hover:text-brand-400"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sellerPhone && (
          phoneRevealed ? (
            <a
              href={`tel:${sellerPhone}`}
              className="rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
            >
              📞 {sellerPhone}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setPhoneRevealed(true)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
            >
              👀 Reveal phone number
            </button>
          )
        )}
        {whatsappDigits && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
          >
            💬 Chat on WhatsApp
          </a>
        )}
        <ShareButtons productName={productName} />
      </div>

      {showModal && (
        <BuyRequestModal
          productId={productId}
          productName={productName}
          price={formattedPrice}
          initialPreference="whatsapp"
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

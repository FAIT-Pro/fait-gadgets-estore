'use client'
// ── components/BuyRequestModal.tsx ────────────────────────────────────────────
// "Request to Buy" modal — visitor enters their name and phone number, which
// gets saved to Supabase and sent to the seller via WhatsApp notification.
// After submitting, the seller contacts the buyer directly to close the sale.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

type Props = {
  productId:   string
  productName: string
  price:       string   // formatted price string, e.g. "₦15,000"
  onClose:     () => void
}

export default function BuyRequestModal({ productId, productName, price, onClose }: Props) {
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Please fill in your name and phone number.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/enquire', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId, productName, buyerName: name, buyerPhone: phone, message }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    }

    setLoading(false)
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sheet (slides up on mobile, centered on desktop) */}
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl
                      shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Request to Buy</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            aria-label="Close"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {success ? (
          // ── Success state ───────────────────────────────────────────────────
          <div className="px-5 py-10 text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center
                            mx-auto mb-4 text-3xl">
              ✅
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">Request sent!</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              The seller will contact you on WhatsApp or phone.
              Keep an eye out for a message from us!
            </p>
            <button
              onClick={onClose}
              className="mt-6 btn-primary w-full py-3 rounded-xl text-sm"
            >
              Back to product
            </button>
          </div>

        ) : (
          // ── Form ────────────────────────────────────────────────────────────
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

            {/* Price reminder */}
            {price && (
              <div className="flex items-center gap-2 bg-brand-50 border border-brand-100
                              rounded-xl px-4 py-2.5">
                <span className="text-brand-700 font-bold text-base">{price}</span>
                <span className="text-brand-600 text-xs">· seller will confirm on contact</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Amaka"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp / phone number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message to seller <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder="Any questions? e.g. Is this still available?"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-ghost py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    Sending…
                  </>
                ) : (
                  '📩 Send Request'
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

export type ContactPreference = 'whatsapp' | 'call'

type Props = {
  productId:         string
  productName:       string
  price:             string
  initialPreference: ContactPreference
  onClose:           () => void
}

export default function BuyRequestModal({
  productId,
  productName,
  price,
  initialPreference,
  onClose,
}: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [preference, setPreference] = useState<ContactPreference>(initialPreference)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Please fill in your name and phone number.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/enquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          buyerName: name,
          buyerPhone: phone,
          message,
          contactPreference: preference,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 backdrop-blur-sm sm:items-center sm:px-4"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 pb-4 pt-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request to Buy</h2>
            <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-3xl dark:bg-brand-900/30">
              ✅
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Request sent!</h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Seller will contact you on WhatsApp or call
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary mt-6 w-full rounded-xl py-3 text-sm"
            >
              Back to product
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            {price && (
              <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 dark:border-brand-800 dark:bg-brand-900/20">
                <span className="text-base font-bold text-brand-700 dark:text-brand-400">{price}</span>
                <span className="text-xs text-brand-600 dark:text-brand-500">· seller will confirm on contact</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="e.g. Amaka"
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                WhatsApp / phone number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                How should the seller contact you?
              </legend>
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700">
                  <input
                    type="radio"
                    name="contactPreference"
                    value="whatsapp"
                    checked={preference === 'whatsapp'}
                    onChange={() => setPreference('whatsapp')}
                    className="accent-brand-600"
                  />
                  <span className="text-gray-700 dark:text-gray-200">WhatsApp</span>
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700">
                  <input
                    type="radio"
                    name="contactPreference"
                    value="call"
                    checked={preference === 'call'}
                    onChange={() => setPreference('call')}
                    className="accent-brand-600"
                  />
                  <span className="text-gray-700 dark:text-gray-200">Call me</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Choose Call if this is urgent.</p>
            </fieldset>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Message to seller <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={event => setMessage(event.target.value)}
                rows={2}
                placeholder="Any questions? e.g. Is this still available?"
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <div className="flex gap-3 pb-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 rounded-xl py-3 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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

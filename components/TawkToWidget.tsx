'use client'
// ── components/TawkToWidget.tsx ───────────────────────────────────────────────
// Adds the Tawk.to live chat bubble to every page.
// Visitors click the bubble to chat with you — messages go to your Tawk.to app,
// and you can reply from your phone just like WhatsApp.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'

export default function TawkToWidget() {
  const tawkId = process.env.NEXT_PUBLIC_TAWKTO_ID

  useEffect(() => {
    // Don't load if the ID hasn't been set up yet
    if (!tawkId) return

    // This is the standard Tawk.to embed script
    const script = document.createElement('script')
    script.src = `https://embed.tawk.to/${tawkId}`
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')
    script.async = true
    document.body.appendChild(script)

    // Cleanup when the page unloads
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [tawkId])

  return null // This component adds a script; it doesn't render any HTML
}

'use client'
// ── components/ThemeToggle.tsx ────────────────────────────────────────────────
// Sun/moon button that switches the storefront between light and dark mode.
// The actual <html class="dark"> toggle + the "no flash on page load" logic
// lives in the inline script in app/layout.tsx — this button just flips it
// and remembers the choice in localStorage so it persists across visits.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  // Starts false (light) to match server-rendered HTML, then syncs to the
  // real value once mounted — avoids a hydration mismatch warning.
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 shrink-0 rounded-full border border-gray-200 dark:border-gray-700
                 flex items-center justify-center text-gray-500 dark:text-gray-300
                 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400
                 transition-colors"
    >
      {isDark ? (
        // Sun — shown in dark mode, click to go light
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m9.99 9.99l1.4 1.4M3 12h2m14 0h2M5.6 18.4l1.4-1.4m9.99-9.99l1.4-1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
      ) : (
        // Moon — shown in light mode, click to go dark
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      )}
    </button>
  )
}

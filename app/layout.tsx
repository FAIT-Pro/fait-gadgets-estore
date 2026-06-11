// ── app/layout.tsx ────────────────────────────────────────────────────────────
// This is the "frame" that wraps every page on the site.
// It adds: fonts, meta tags, Tawk.to live chat widget, and global styles.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import TawkToWidget from '@/components/TawkToWidget'

const inter = Inter({ subsets: ['latin'] })

// ── SEO / Social share meta tags ──────────────────────────────────────────────
export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_STORE_NAME || 'My Store',
  description: 'Browse our latest products. Fresh items added daily.',
  openGraph: {
    title: process.env.NEXT_PUBLIC_STORE_NAME || 'My Store',
    description: 'Browse our latest products. Fresh items added daily.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FG Admin" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className={inter.className}>
        {children}
        {/* Live chat widget — appears as a bubble in the corner of every page */}
        <TawkToWidget />
      </body>
    </html>
  )
}

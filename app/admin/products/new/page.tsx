// ── app/admin/products/new/page.tsx ────────────────────────────────────────────
// Server Component wrapper — checks admin auth, then renders the upload form.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect }      from 'next/navigation'
import { isAdminAuthed } from '@/lib/auth'
import UploadForm        from './UploadForm'

export default function NewProductPage() {
  if (!isAdminAuthed()) redirect('/admin')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href="/admin/dashboard"
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 className="text-base font-bold text-gray-900">Add New Product</h1>
            <p className="text-xs text-gray-400">AI fills in the details automatically</p>
          </div>
        </div>
      </header>

      {/* ── Upload form (client component) ─────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <UploadForm />
      </main>
    </div>
  )
}

// ── app/admin/page.tsx ─────────────────────────────────────────────────────────
// The admin entry point.
// - If you're already logged in → you're redirected straight to the dashboard.
// - If not → you see the login form.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect }    from 'next/navigation'
import { isAdminAuthed } from '@/lib/auth'
import LoginForm       from './LoginForm'
import ThemeToggle     from '@/components/ThemeToggle'

export default function AdminLoginPage() {
  // Already logged in? Skip the form and go straight to the dashboard
  if (isAdminAuthed()) {
    redirect('/admin/dashboard')
  }

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800
                      w-full max-w-sm p-8">

        {/* Store icon + name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-brand-600 rounded-2xl mb-4">
            <span className="text-2xl">🛍️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{storeName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Admin Dashboard</p>
        </div>

        {/* Login form (client component — handles state + fetch) */}
        <LoginForm />

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          <a href="/" className="hover:text-brand-600 transition-colors">
            ← Back to store
          </a>
        </p>
      </div>
    </div>
  )
}

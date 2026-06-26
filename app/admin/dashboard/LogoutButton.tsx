'use client'
// ── app/admin/dashboard/LogoutButton.tsx ──────────────────────────────────────
// A small button that calls the logout API, then sends the admin back to the
// login page. Needs "use client" because it uses onClick and useRouter.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                 transition-colors border border-red-100 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-700
                 rounded-lg px-3 py-1.5"
    >
      Logout
    </button>
  )
}

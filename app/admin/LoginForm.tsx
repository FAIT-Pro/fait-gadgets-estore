'use client'
// ── app/admin/LoginForm.tsx ────────────────────────────────────────────────────
// The password input form shown on the admin login page.
// "use client" is required here because this component uses useState and
// calls fetch() — both are browser-only features.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      // Login succeeded — go to the dashboard
      router.push('/admin/dashboard')
    } else {
      setError('Wrong password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter your admin password"
          required
          autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                     text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100
                      rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="btn-primary w-full"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

// ── app/api/admin/logout/route.ts ─────────────────────────────────────────────
// Clears the admin session cookie, effectively logging the admin out.
// After this, any attempt to visit /admin/dashboard will redirect to the login page.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })

  // Delete the cookie by setting it with maxAge = 0
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })

  return response
}

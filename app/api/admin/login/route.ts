// ── app/api/admin/login/route.ts ───────────────────────────────────────────────
// Receives the admin password from the login form.
// If it matches the ADMIN_PASSWORD env var → sets a secure session cookie.
// The cookie lasts 7 days and is httpOnly (JavaScript can't read or steal it).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  // Compare submitted password against the one stored in environment variables
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })

  // Set secure session cookie
  response.cookies.set('admin_token', 'verified', {
    httpOnly: true,                   // Cannot be read by browser JavaScript
    maxAge: 60 * 60 * 24 * 7,        // 7 days in seconds
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  })

  return response
}

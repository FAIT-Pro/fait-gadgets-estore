// ── lib/auth.ts ────────────────────────────────────────────────────────────────
// Helpers to check whether the current visitor is the logged-in admin.
// The admin session is stored in a secure, httpOnly cookie called "admin_token".
// httpOnly means JavaScript in the browser can NEVER read it — only the server can.
// ─────────────────────────────────────────────────────────────────────────────

import { cookies }     from 'next/headers'
import { NextRequest } from 'next/server'

// ── For Server Components and layouts (app/admin/...) ────────────────────────
// Call this at the top of any admin page to check if the visitor is logged in.
export function isAdminAuthed(): boolean {
  const token = cookies().get('admin_token')?.value
  return token === 'verified'
}

// ── For API route handlers (app/api/admin/...) ────────────────────────────────
// Same check, but reads the cookie from the incoming HTTP request object
// instead of the Next.js cookies() helper (which only works in Server Components).
export function isAdminAuthedFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  return token === 'verified'
}

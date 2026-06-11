// ── lib/supabase.ts ───────────────────────────────────────────────────────────
// Think of this file as the "phone" we use to call the database.
// We have two phones:
//   1. supabase       → for the storefront (read-only, safe to use anywhere)
//   2. supabaseAdmin  → for the bot/API routes (full access, keep it secret!)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

// ── Public client (storefront) ───────────────────────────────────────────────
// The NEXT_PUBLIC_ prefix means this is safe to expose in the browser.
// Supabase's Row Level Security policies still protect your data.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Admin client (API routes only) ───────────────────────────────────────────
// This key bypasses Row Level Security. NEVER use it in browser/client code.
// Only use it inside /app/api/... files that run on the server.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── TypeScript types (the "shape" of our database rows) ──────────────────────
// These help catch mistakes when we read/write data.

export type Product = {
  id: string
  name: string
  description: string | null
  price: number | null
  currency: string
  category: string
  image_url: string | null
  image_urls: string[]
  status: 'available' | 'sold' | 'draft'
  created_at: string
  updated_at: string
}

export type Interaction = {
  id: string
  product_id: string
  type: 'view' | 'like' | 'save' | 'enquiry'
  visitor_id: string | null
  created_at: string
}

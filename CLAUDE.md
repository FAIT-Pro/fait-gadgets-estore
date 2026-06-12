# CLAUDE.md — WhatsApp E-Store Project Guide

This file tells Claude Code everything it needs to know about this project.
Read this fully before making any changes.

**Last verified:** 2026-06-12 (Session 5 — complete)

---

## What This Project Is

A zero-cost e-commerce storefront with two ways to list products:

**Channel A — WhatsApp (original design):**
Owner forwards WhatsApp image → Meta Cloud API delivers it to our webhook → Gemini AI
reads it → product saved to Supabase → appears on storefront → visitor interacts →
owner gets WhatsApp notification.

**Channel B — Admin Upload Interface (added Session 3 after Meta verification rejection):**
Owner logs in to /admin → taps "Add Product" → takes/uploads a photo → Gemini AI
reads it → fields pre-filled → owner reviews and edits → Save as Draft or Publish Now.

Both channels use the same Gemini + Cloudinary + Supabase pipeline.
The Admin Upload Interface is the primary input channel until Meta verifies the business.

**Store name:** FAIT Gadgets
**Live URL:** https://fait-gadgets-estore.vercel.app
**Admin panel:** https://fait-gadgets-estore.vercel.app/admin

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js 14.1.0 (App Router) | Server + client components, API routes |
| Language | TypeScript | Type safety throughout |
| Styling | Tailwind CSS | Utility-first, no separate CSS files needed |
| Database | Supabase (PostgreSQL) | Free tier, real-time, row-level security |
| Image storage | Cloudinary | Free CDN, auto-optimization |
| AI processing | Google Gemini 2.5 Flash | Reads image + caption → structured product data |
| WhatsApp bot | Meta WhatsApp Cloud API | Receives forwarded messages via webhook (migrated from Green API) |
| Seller notifications | Meta WhatsApp Cloud API | Sends WhatsApp messages to the seller's phone (same API as bot) |
| Live chat | Tawk.to | Widget on storefront — CONFIGURED ✅ (NEXT_PUBLIC_TAWKTO_ID set) |
| Hosting | Vercel | Free, deploys automatically from Git |

---

## Project File Map

```
estore/
│
├── CLAUDE.md               ← YOU ARE HERE
├── SESSION_LOG.md          ← Session-by-session change log
├── SETUP_GUIDE.md          ← Step-by-step account setup for the owner
├── schema.sql              ← Run once in Supabase SQL Editor to create tables
├── .env.example            ← Template for all environment variables
├── .env.local              ← Owner's actual secrets (never commit this)
│
├── package.json            ← Dependencies
├── next.config.js          ← Allows Cloudinary image domains only (green-api.com removed)
├── tailwind.config.js      ← Brand green color + content paths
├── tsconfig.json           ← TypeScript config
├── postcss.config.js       ← Required for Tailwind
│
├── lib/                    ← Shared server-side utilities
│   ├── supabase.ts         ← Two clients: public (storefront) + admin (API routes + dashboard)
│   │                          Also exports Product and Interaction TypeScript types
│   ├── gemini.ts           ← Calls Gemini 2.5 Flash via REST API (NOT the SDK)
│   │                          Returns: { name, description, price, currency, category }
│   ├── cloudinary.ts       ← Uploads image URL or base64 dataUri → returns CDN URL
│   ├── notify.ts           ← Sends WhatsApp messages to seller via Meta Cloud API
│   │                          Exports: notifySeller(), productListedMessage(), visitorInteractionMessage()
│   └── auth.ts             ← Admin auth helpers
│                              isAdminAuthed() — for Server Component pages
│                              isAdminAuthedFromRequest() — for API routes
│
├── app/                    ← Next.js App Router pages and API routes
│   ├── globals.css         ← Tailwind base + custom component classes (.btn-primary, .badge, etc.)
│   ├── layout.tsx          ← Root layout: fonts, meta tags, TawkToWidget on every page
│   ├── page.tsx            ← Main storefront: product grid, category filter, search
│   │
│   ├── product/
│   │   └── [id]/
│   │       └── page.tsx    ← Individual product page: ImageGallery, description, EnquireButton
│   │                          Uses supabaseAdmin — sold products show SOLD overlay (BUG 1 fixed)
│   │
│   ├── admin/
│   │   ├── page.tsx        ← Admin login page (redirects to dashboard if already authed)
│   │   ├── LoginForm.tsx   ← Client component: password form with error display
│   │   ├── dashboard/
│   │   │   ├── page.tsx            ← Dashboard: stats (Live/Drafts/Sold) + tabbed product list
│   │   │   ├── LogoutButton.tsx    ← Client logout button → calls /api/admin/logout
│   │   │   ├── ProductTabs.tsx     ← Client component: Live / Drafts / Sold tab switcher
│   │   │   └── ProductActions.tsx  ← Per-product row:
│   │   │                               Draft  → Edit / Publish / Delete
│   │   │                               Live   → Edit / Unpublish / Mark Sold / Copy URL / Delete
│   │   │                               Sold   → Edit / Re-list / Delete
│   │   └── products/
│   │       └── new/
│   │           ├── page.tsx        ← Server Component wrapper (auth guard)
│   │           └── UploadForm.tsx  ← Client component: three-step upload form
│   │                                   Step 1: tap-to-photo OR pick from image library
│   │                                   Step 2: spinner while Cloudinary + Gemini run in parallel
│   │                                   Step 3: pre-filled editable form, multi-photo strip, Save Draft / Publish Now
│   │
│   └── api/
│       ├── webhook/
│       │   └── route.ts    ← GET: Meta webhook verification
│       │                      POST: Incoming WhatsApp messages → list product or handle SOLD command
│       │                      Verifies X-Hub-Signature-256 using META_APP_SECRET (BUG 2 fixed ✅)
│       ├── track/
│           └── route.ts    ← POST: logs visitor interactions (view/like/save/enquiry)
│                              Notifies seller for like, save, enquiry (not views)
│       └── admin/
│           ├── login/
│           │   └── route.ts    ← POST: verify ADMIN_PASSWORD, set httpOnly cookie (7 days)
│           ├── logout/
│           │   └── route.ts    ← POST: clear admin cookie (sets maxAge = 0)
│           ├── analyze/
│           │   └── route.ts         ← POST: file → Cloudinary + Gemini in parallel → product fields
│           ├── images/
│           │   └── route.ts         ← GET: all distinct image URLs from DB (newest first, deduplicated)
│           ├── upload-image/
│           │   └── route.ts         ← POST: extra photos → Cloudinary only (no Gemini)
│           └── products/
│               ├── route.ts         ← POST: create new product (used by UploadForm)
│               └── [id]/
│                   └── route.ts     ← PATCH (edit fields incl. status) + DELETE — both auth-gated
│
└── components/             ← Reusable React components
    ├── ProductCard.tsx     ← Product tile: image, name, price, like/save buttons
    │                          Tracks views on mount, persists like/save in localStorage
    ├── EnquireButton.tsx   ← "Enquire / Buy" button: logs enquiry + opens Tawk.to chat
    ├── ImageGallery.tsx    ← Multi-photo viewer: large main image + thumbnail strip + SOLD overlay
    ├── TawkToWidget.tsx    ← Injects Tawk.to script into every page
    └── admin/
        └── ImagePickerModal.tsx  ← 3-column grid modal to reuse existing product photos
```

---

## Database Schema (Supabase)

### Table: `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| name | text | AI-generated product name |
| description | text | AI-generated description |
| price | numeric(12,2) | Extracted from image/caption, nullable |
| currency | text | 'NGN' or 'USD', default 'NGN' |
| category | text | One of: Fashion, Electronics, Food & Drinks, Beauty, Home & Living, Other |
| image_url | text | Cloudinary CDN URL |
| status | text | 'available', 'sold', or 'draft' — no CHECK constraint, plain text |
| image_urls | text[] | Array of all product image URLs (first = primary). Add with: `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';` |
| wa_message_id | text | Meta message ID (used for deduplication — prevents listing same message twice) |
| created_at | timestamptz | Auto set |
| updated_at | timestamptz | Auto-updated via trigger |

### Table: `interactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | Foreign key → products.id |
| type | text | 'view', 'like', 'save', or 'enquiry' |
| visitor_id | text | Anonymous browser ID from localStorage |
| created_at | timestamptz | Auto set |

### View: `product_stats`
Joins products with interaction counts. Use for analytics:
`select * from product_stats;`

### Row Level Security (RLS) — Important Behaviour
- Public client can only read `status = 'available'` products
- This means: draft and sold products are completely invisible to the storefront (intentional for drafts)
- `supabaseAdmin` bypasses RLS — used in admin dashboard, webhook handler, and the new admin API routes
- **Known bug:** product detail page uses the public client, so sold products return 404 instead of a "SOLD" overlay

---

## Environment Variables

All required. See `.env.example` for the full list with comments.
Never commit `.env.local` — it contains secrets.

### Current `.env.local` status (as of 2026-06-09)

```
# ── SUPABASE ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://nbijqijxqjattrquzocb.supabase.co  ← SET
NEXT_PUBLIC_SUPABASE_ANON_KEY=...                                   ← SET
SUPABASE_SERVICE_ROLE_KEY=...                                       ← SET

# ── CLOUDINARY ────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=fait                                          ← SET (cloud name, not API key name)
CLOUDINARY_API_KEY=724116592859517                                  ← SET
CLOUDINARY_API_SECRET=...                                           ← SET

# ── GOOGLE GEMINI AI ──────────────────────────────────
GEMINI_API_KEY=AQ.Ab8RN6J...                                        ← SET (new format, valid)

# ── META WHATSAPP CLOUD API ───────────────────────────
META_ACCESS_TOKEN=...                                               ← SET
META_PHONE_NUMBER_ID=1132807136580749                               ← SET
META_WABA_ID=15720796582561044                                      ← SET
META_WEBHOOK_VERIFY_TOKEN=fait-gadgets-webhook-2026                 ← SET
META_APP_SECRET=...                                                 ← SET ✅ (Session 5 — activates webhook security)

# ── SELLER ────────────────────────────────────────────
SELLER_PHONE=2347037401412                                          ← SET (Nigerian format, no +)

# ── STORE SETTINGS ────────────────────────────────────
NEXT_PUBLIC_STORE_NAME=FAIT Gadgets                                 ← SET
NEXT_PUBLIC_SITE_URL=https://fait-gadgets-estore.vercel.app        ← SET

# ── TAWK.TO ───────────────────────────────────────────
NEXT_PUBLIC_TAWKTO_ID=6a2a9f25f.../1jqr7rbgv                       ← SET ✅ (Session 5 — live chat enabled)

# ── ADMIN DASHBOARD ───────────────────────────────────
ADMIN_PASSWORD=FaitGadg3ts#2026                                     ← SET ✅ (changed from admin123 in Session 5)
```

### Variables that are NO LONGER needed (Green API era — do not re-add)
```
GREEN_API_INSTANCE     ← removed, commented out in .env.local
GREEN_API_TOKEN        ← removed, commented out in .env.local
CALLMEBOT_API_KEY      ← removed (notifications now via Meta)
```

---

## Key Rules — Follow These Always

### 1. Server vs Client components
- `app/page.tsx` and `app/product/[id]/page.tsx` are **Server Components** — they fetch from Supabase directly, no `useEffect`, no `useState`
- `app/admin/dashboard/page.tsx` is a **Server Component** — uses `supabaseAdmin` (exception to rule 2 below)
- All `components/*.tsx` files are **Client Components** — they have `'use client'` at the top
- API routes (`app/api/**/route.ts`) run on the **server only** — use `supabaseAdmin` here

### 2. supabaseAdmin usage
`supabaseAdmin` (service role key) bypasses Row Level Security.
It is used in:
- All `app/api/` route files
- `app/admin/dashboard/page.tsx` (Server Component — runs server-side, safe)

Never use `supabaseAdmin` inside client components or `lib/` files that get imported by components.

### 3. Tailwind only — no inline styles
All styling goes through Tailwind classes. Custom reusable classes (`.btn-primary`, `.btn-ghost`, `.badge`, `.price-tag`) are defined in `app/globals.css`. Do not add `style={{}}` props.

### 4. Image handling
All product images go through Cloudinary before being saved to the database.
The webhook downloads the image from Meta (requires Bearer auth header), then passes the base64 dataUri to `uploadProductImage()`. Never save a temporary Meta media URL to Supabase.

### 5. Error handling in the webhook
The webhook (`app/api/webhook/route.ts`) must always return HTTP 200, even on errors.
If it returns 4xx or 5xx, Meta will retry repeatedly and can create duplicate products.
Log errors to console but return `{ ok: false }` with status 200.

### 6. Notifications are fire-and-forget
`notifySeller()` catches its own errors internally. Never `await` it in a way that would block the main product listing flow if the Meta API is slow or down.

### 7. Gemini uses REST API directly — not the SDK
`lib/gemini.ts` calls `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent` directly via `fetch`. The `@google/generative-ai` package in `package.json` is a leftover and is NOT used. Do not import from it.

### 8. Admin auth is cookie-based
`lib/auth.ts` checks for `admin_token === 'verified'` cookie. The cookie is set by `/api/admin/login` for 7 days. It is httpOnly (JavaScript cannot read it). Always use `isAdminAuthed()` in Server Components and `isAdminAuthedFromRequest(req)` in API routes.

### 9. HTML Session Log is mandatory — update it every session
`WhatsApp-Estore - Claude Dev Session (14_05_2026).html` in the project root is the primary tutorial record of this project. It must be updated **verbatim** at the end of every session — every exchange, every code block, every command, every output, every error, every fix. Nothing summarised. This file is updated alongside `CLAUDE.md` and `SESSION_LOG.md`. Omitting it is not acceptable.

---

## Known Bugs (to be fixed)

### BUG 1: Sold products show 404 instead of "SOLD" overlay
**File:** `app/product/[id]/page.tsx`
**Cause:** Uses the public Supabase client. RLS policy blocks public access to `status = 'sold'` products. So fetching a sold product returns null → `notFound()` → 404.
**Symptom:** A visitor who bookmarked a product gets a 404 after it's sold.
**Fix options:**
- Option A: Add a second Supabase query using `supabaseAdmin` as a fallback (or just use `supabaseAdmin` for the product detail page)
- Option B: Modify the RLS policy to allow public clients to read all products (including sold), relying on the `status` field for display logic

### BUG 2: Webhook signature verification — FULLY FIXED ✅
**File:** `app/api/webhook/route.ts`
**Fixed Session 5:** HMAC-SHA256 verification using `META_APP_SECRET` (now set on Vercel).
**Live tested:** Three curl tests confirmed — unsigned/wrong-signed requests return `{"ok":false}`,
correctly signed requests return `{"ok":true}`. Deployed and verified 2026-06-12.

---

## Dead Code / Stale Items (cleanup backlog)

All previous items resolved in Session 4. No remaining stale items.

---

## How to Run Locally

```bash
# Install dependencies (first time only)
npm install

# Start local dev server
npm run dev
# → Opens at http://localhost:3000

# Build for production (checks for type errors)
npm run build
```

Requires `.env.local` to be filled in before `npm run dev` works properly.

---

## How to Deploy

```bash
# First-time Vercel setup
vercel

# Deploy to production
vercel --prod
```

Environment variables must also be added in Vercel dashboard:
Project → Settings → Environment Variables

After deploying, register the webhook URL in Meta Developer Console:
`https://fait-gadgets-estore.vercel.app/api/webhook`
Verify token: `fait-gadgets-webhook-2026` (matches `META_WEBHOOK_VERIFY_TOKEN`)

---

## Seller Commands (via WhatsApp)

| Message sent to the WhatsApp Business number | What happens |
|---|---|
| Any image (with or without caption) | Product is listed on the store |
| Text: `SOLD` | Most recently listed available product is marked as sold |

---

## What Has Been Built ✅

- [x] Storefront: product grid, category filter, search bar
- [x] Individual product page with enquiry button + SOLD overlay logic
- [x] WhatsApp webhook — Meta Cloud API (GET verification + POST message handler)
- [x] Gemini 2.5 Flash AI pipeline (image + caption → product name/description/price/category)
- [x] Cloudinary upload pipeline (Meta image → base64 → Cloudinary CDN URL)
- [x] Seller notifications via Meta Cloud API (new listing, like, save, enquiry)
- [x] Visitor interaction tracking (view/like/save/enquiry stored in Supabase)
- [x] Deduplication via `wa_message_id` (same message cannot create two products)
- [x] Admin login page with password form
- [x] Admin session cookie (httpOnly, 7 days, cleared on logout)
- [x] Admin dashboard: stats (Live / Drafts / Sold), three-tab product list
- [x] Per-product actions vary by status:
  - Draft: Publish, Edit, Delete
  - Live: Unpublish, Mark Sold, Copy URL, Edit, Delete
  - Sold: Re-list, Edit, Delete
- [x] Admin product upload page (`/admin/products/new`):
  - Tap-to-photo / gallery picker (opens camera on mobile)
  - Parallel Cloudinary upload + Gemini AI analysis
  - Fields pre-filled by AI, all editable
  - Save as Draft or Publish Now
- [x] `/api/admin/analyze` — POST endpoint: file → base64 → Cloudinary + Gemini in parallel
- [x] `/api/admin/products` — POST endpoint: create new product with any status
- [x] Draft/Publish workflow: status = 'draft' | 'available' | 'sold' (no schema migration needed)
- [x] PWA manifest (`/public/manifest.json`) + SVG icon + mobile viewport meta tags
- [x] Multi-image support per product (up to 6 photos):
  - `image_urls TEXT[]` column in Supabase (run migration SQL above)
  - Upload form: first photo triggers Gemini AI; additional photos go to Cloudinary only
  - Thumbnail strip in upload form — click to preview, × to remove
  - ImageGallery component on product detail page (large image + thumbnail row)
  - Edit form in dashboard: add/remove photos per product
- [x] **Image library picker** — reuse previously uploaded photos without re-uploading:
  - `GET /api/admin/images` — returns all distinct image URLs from database (newest first)
  - `components/admin/ImagePickerModal.tsx` — 3-column grid modal, tap to select
  - Available on upload page (new product) and in edit form (existing product)
  - Two buttons in thumbnail strip: `+` (upload new) and gallery icon (pick from library)
  - On upload stage: picking from library skips Gemini and goes straight to the form
- [x] BUG 1 fixed: sold products now show SOLD overlay (product detail page uses `supabaseAdmin`)
- [x] BUG 2 fully fixed + live tested: webhook rejects forged requests via HMAC-SHA256 signature check
- [x] ADMIN_PASSWORD strengthened: changed from `admin123` to `FaitGadg3ts#2026` (set on Vercel)
- [x] `META_APP_SECRET` set on Vercel — webhook security active in production
- [x] `NEXT_PUBLIC_TAWKTO_ID` set — Tawk.to live chat widget active on storefront
- [x] `schema.sql` comment fixed: `wa_message_id` now says "Meta message ID"
- [x] Stale code removed: `*.green-api.com`, `@google/generative-ai`, Green API / CallMeBot vars
- [x] Cloudinary cloud name corrected to `fait`
- [x] All code committed and deployed via `vercel --prod` (FAIT-Pro account)

---

## What Has NOT Been Built Yet ❌

### Bugs
- [x] **BUG 1 FIXED** — Sold products show SOLD overlay (Session 4)
- [x] **BUG 2 FIXED** — Webhook signature verification active + live tested (Session 5)

### Features
- [ ] "Mark specific product as SOLD" by product ID via WhatsApp (currently only marks the latest)
- [ ] Bulk upload (multiple images in one WhatsApp message)
- [ ] Order / reservation system
- [ ] Analytics page using the `product_stats` Supabase view
- [ ] Email notifications via Resend as a portable alternative to Meta permanent token

### Deployment note
- Vercel CLI must be logged into **FAIT-Pro** account (`vercel login` if needed — not `fait-blog-3543`)
- GitHub CLI must be logged into **FAIT-Pro** account (`gh auth login` if needed)
- Both were switched during Session 5; re-verify if terminal is reset

---

## Owner Context

- Store name: FAIT Gadgets
- Seller is based in Nigeria — default currency is NGN (₦)
- Seller phone: Nigerian number stored as `SELLER_PHONE=2347037401412`
- Business is WhatsApp-first; the seller already posts products to WhatsApp Status daily
- The seller is a beginner with coding — keep changes simple and well-commented
- Every file in this project has inline comments explaining what each section does

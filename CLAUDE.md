# CLAUDE.md — WhatsApp E-Store Project Guide

This file tells Claude Code everything it needs to know about this project.
Read this fully before making any changes.

**Last verified:** 2026-06-25 (Session 8 — Telegram multi-photo album bug fixed)

---

## What This Project Is

A zero-cost e-commerce storefront with three ways to list products:

**Channel A — WhatsApp bot (original design, currently blocked):**
Owner forwards WhatsApp image → Meta Cloud API delivers it to our webhook → Gemini AI
reads it → product saved to Supabase → appears on storefront → visitor interacts →
owner gets WhatsApp notification.
Status: Meta Business verification was rejected. Channel exists in code but is non-functional
until Meta approves. Plan is to replace Meta with a Telegram bot (see Channel C).

**Channel B — Admin Upload Interface (primary channel):**
Owner logs in to /admin → taps "Add Product" → takes/uploads a photo → Gemini AI
reads it → fields pre-filled → owner reviews and edits → Save as Draft or Publish Now.
This is the main input channel and always works with no external dependencies.

**Channel C — Telegram Bot (built and live, Session 7; multi-photo fixed Session 8):**
Owner forwards product photo(s) to the Telegram bot → same Gemini + Cloudinary + Supabase
pipeline → product listed (auto-published, `status: 'available'`) → seller gets a Telegram
confirmation in the same chat. Sending the text `SOLD` marks the most recent available
product as sold. Telegram requires zero business verification, no token expiry. Currently
runs alongside Meta (not yet retired) — WhatsApp still stays as the customer-facing channel
for buyers; Telegram is the seller's listing tool.
Sending several photos at once (a Telegram "album") now correctly merges into ONE product
with all photos attached — see Rule 13 below for how this works.

All three channels use the same Gemini + Cloudinary + Supabase pipeline.

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
| WhatsApp bot | Meta WhatsApp Cloud API | BLOCKED — Business verification rejected. Webhook code exists, not functional |
| Telegram bot | Telegram Bot API | LIVE ✅ (Session 7) — listing pipeline + SOLD command + multi-photo album merging (Session 8) |
| Seller notifications | Meta WhatsApp Cloud API | Still active for non-Telegram events (likes/saves/enquiries) — not yet retired, may fail when token expires |
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
├── next.config.js          ← Allows Cloudinary image domains only
├── tailwind.config.js      ← Brand green color + content paths
├── tsconfig.json           ← TypeScript config
├── postcss.config.js       ← Required for Tailwind
│
├── lib/                    ← Shared server-side utilities
│   ├── supabase.ts         ← Two clients: public (storefront) + admin (API routes + dashboard)
│   │                          Also exports Product, Interaction TypeScript types
│   ├── gemini.ts           ← Calls Gemini 2.5 Flash via REST API (NOT the SDK)
│   │                          Returns: { name, description, price, currency, category }
│   ├── cloudinary.ts       ← Uploads image URL or base64 dataUri → returns CDN URL
│   ├── notify.ts           ← Sends WhatsApp messages to seller via Meta Cloud API
│   │                          Logs HTTP status + body on failure (added Session 6)
│   │                          Exports: notifySeller(), productListedMessage(), visitorInteractionMessage()
│   ├── telegram.ts         ← Telegram bot helpers (added Session 7)
│   │                          sendTelegramMessage(chatId, text) — mirrors notifySeller()
│   │                          downloadTelegramFile(fileId) — file_id → file_path → base64 dataUri
│   │                          productListedMessage() takes an optional photoCount (Session 8)
│   │                          Exports: sendTelegramMessage(), downloadTelegramFile(), productListedMessage()
│   └── auth.ts             ← Admin auth helpers
│                              isAdminAuthed() — for Server Component pages
│                              isAdminAuthedFromRequest() — for API routes
│
├── app/                    ← Next.js App Router pages and API routes
│   ├── globals.css         ← Tailwind base + custom component classes (.btn-primary, .badge, etc.)
│   ├── layout.tsx          ← Root layout: fonts, meta tags, TawkToWidget on every page
│   ├── page.tsx            ← Main storefront: product grid, category filter, live search
│   │                          revalidate = 600 (on-demand revalidation fires on admin actions)
│   │
│   ├── product/
│   │   └── [id]/
│   │       └── page.tsx    ← Individual product page: ImageGallery, description, EnquireButton
│   │                          Uses supabaseAdmin — sold products show SOLD overlay ✅
│   │                          revalidate = 600 (on-demand revalidation fires on status changes)
│   │
│   ├── admin/
│   │   ├── page.tsx        ← Admin login page (redirects to dashboard if already authed)
│   │   ├── LoginForm.tsx   ← Client component: password form with error display
│   │   ├── dashboard/
│   │   │   ├── page.tsx            ← Dashboard: stats (Live/Drafts/Sold) + tabbed product list
│   │   │   ├── LogoutButton.tsx    ← Client logout button → calls /api/admin/logout
│   │   │   ├── ProductTabs.tsx     ← Client component: Live / Drafts / Sold tab switcher
│   │   │   └── ProductActions.tsx  ← Per-product row (simplified Session 6):
│   │   │                               Edit → links to /admin/products/[id]/edit
│   │   │                               Status buttons: Publish / Unpublish / Mark Sold / Re-list
│   │   │                               Copy URL / Delete
│   │   └── products/
│   │       ├── new/
│   │       │   ├── page.tsx        ← Server Component wrapper (auth guard)
│   │       │   └── UploadForm.tsx  ← Client component: three-step upload form
│   │       │                           Step 1: tap-to-photo OR pick from image library
│   │       │                           Step 2: spinner while Cloudinary + Gemini run in parallel
│   │       │                           Step 3: pre-filled editable form, multi-photo strip, Save Draft / Publish Now
│   │       └── [id]/
│   │           └── edit/
│   │               ├── page.tsx    ← Server Component: auth guard + fetch product → renders EditForm
│   │               └── EditForm.tsx ← Client component: full-page product editor
│   │                                   All fields editable: name, price, currency, category,
│   │                                   description, photos (add/remove/library pick)
│   │                                   Save as Draft / Publish buttons
│   │
│   └── api/
│       ├── webhook/
│       │   └── route.ts    ← GET: Meta webhook verification
│       │                      POST: Incoming WhatsApp messages → list product or handle SOLD command
│       │                      Verifies X-Hub-Signature-256 using META_APP_SECRET ✅
│       │                      NOTE: Currently blocked by Meta verification rejection
│       ├── telegram/
│       │   └── route.ts    ← POST only (added Session 7, LIVE in production)
│       │                      Incoming Telegram messages → list product or handle SOLD command
│       │                      Single photo → downloadTelegramFile() → uploadProductImage() → extractProductInfo()
│       │                      → Supabase insert (status: 'available') → sendTelegramMessage() confirmation
│       │                      Multi-photo album (message.media_group_id set, Session 8) →
│       │                      handleAlbumPhoto() stages each photo in telegram_media_groups,
│       │                      debounces 2s, merges into ONE product once the album finishes arriving
│       │                      Always returns HTTP 200, same rule as the Meta webhook
│       │                      export const maxDuration = 60 (debounce wait + Gemini exceeds the 10s default)
│       ├── track/
│       │   └── route.ts    ← POST: logs visitor interactions (view/like/save/enquiry)
│       │                      Notifies seller for like, save, enquiry (not views)
│       ├── enquire/
│       │   └── route.ts    ← POST: saves buyer contact details to enquiries table
│       │                      Also logs interaction + notifies seller with full buyer info
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
│               ├── route.ts         ← POST: create new product; calls revalidatePath('/') on success
│               └── [id]/
│                   └── route.ts     ← PATCH (edit fields incl. status) + DELETE — both auth-gated
│                                       PATCH calls revalidatePath('/') + revalidatePath('/product/[id]')
│                                       DELETE calls revalidatePath('/')
│
└── components/             ← Reusable React components
    ├── ProductCard.tsx     ← Product tile: image, name, price, like/save buttons
    │                          Tracks views on mount, persists like/save in localStorage
    ├── EnquireButton.tsx   ← Two-button row: "Request to Buy" (opens modal) + chat icon (Tawk.to)
    ├── BuyRequestModal.tsx ← Bottom-sheet modal: buyer name + phone + optional message
    │                          Submits to /api/enquire → success confirmation shown
    ├── SearchBar.tsx       ← Live search client component: 300ms debounce + useTransition spinner
    │                          Wrapped in <Suspense> in page.tsx (required for useSearchParams)
    ├── ImageGallery.tsx    ← Multi-photo viewer: large main image + thumbnail strip + SOLD overlay
    ├── TawkToWidget.tsx    ← Injects Tawk.to script into every page
    └── admin/
        └── ImagePickerModal.tsx  ← 3-column grid modal to reuse existing product photos
```

---

## Database Schema (Supabase)

**Important:** Run `schema.sql` in Supabase → SQL Editor to create all tables.
Each session adds new tables/columns — always run the full file (all statements use IF NOT EXISTS).

### Table: `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| name | text | AI-generated product name |
| description | text | AI-generated description |
| price | numeric(12,2) | Extracted from image/caption, nullable |
| currency | text | 'NGN' or 'USD', default 'NGN' |
| category | text | One of: Fashion, Electronics, Food & Drinks, Beauty, Home & Living, Other |
| image_url | text | Cloudinary CDN URL (primary image) |
| image_urls | text[] | Array of all product image URLs (first = primary) |
| status | text | 'available', 'sold', or 'draft' — no CHECK constraint, plain text |
| wa_message_id | text | External message ID for deduplication — Meta media ID, Telegram message ID prefixed `tg_`, or Telegram album ID prefixed `tg_group_` (added Session 8) |
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

### Table: `enquiries` (added Session 6)
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | Foreign key → products.id (nullable) |
| product_name | text | Name of product at time of enquiry |
| buyer_name | text | Buyer's name (required) |
| buyer_phone | text | Buyer's WhatsApp/phone number (required) |
| message | text | Optional message to seller |
| created_at | timestamptz | Auto set |

### Table: `telegram_media_groups` (added Session 8 — server-only, no public policies)
| Column | Type | Notes |
|---|---|---|
| media_group_id | text | Primary key — Telegram's album ID |
| chat_id | text | Telegram chat ID, used to send the confirmation once finalized |
| image_urls | text[] | Cloudinary URLs collected so far for this album |
| caption | text | First caption seen across the album's photos |
| update_count | integer | Bumped atomically by `append_telegram_media_group()` on every photo |
| processed | boolean | Set true once one photo's debounce wait elapses with no further updates |
| created_at | timestamptz | Auto set |

Used only by `app/api/telegram/route.ts` to merge a multi-photo Telegram album into one
product. See Rule 13.

### View: `product_stats`
Joins products with interaction counts. Use for analytics:
`select * from product_stats;`

### Row Level Security (RLS) — Important Behaviour
- Public client can only read `status = 'available'` products
- Draft and sold products are invisible to the storefront (intentional for drafts)
- `supabaseAdmin` bypasses RLS — used in admin dashboard, webhook handler, all admin API routes
- Product detail page uses `supabaseAdmin` so sold products show SOLD overlay (not 404)
- `enquiries` table: public can INSERT (anyone can submit a buy request), admin reads via supabaseAdmin

---

## Environment Variables

All required. See `.env.example` for the full list with comments.
Never commit `.env.local` — it contains secrets.

### Current `.env.local` status (as of 2026-06-19)

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

# ── META WHATSAPP CLOUD API (may be replaced by Telegram in Session 7) ────────
META_ACCESS_TOKEN=...                                               ← SET (risk: temporary token, may expire)
META_PHONE_NUMBER_ID=1132807136580749                               ← SET
META_WABA_ID=15720796582561044                                      ← SET
META_WEBHOOK_VERIFY_TOKEN=fait-gadgets-webhook-2026                 ← SET
META_APP_SECRET=...                                                 ← SET ✅

# ── SELLER ────────────────────────────────────────────
SELLER_PHONE=2347037401412                                          ← SET (Nigerian format, no +)

# ── STORE SETTINGS ────────────────────────────────────
NEXT_PUBLIC_STORE_NAME=FAIT Gadgets                                 ← SET
NEXT_PUBLIC_SITE_URL=https://fait-gadgets-estore.vercel.app        ← SET

# ── TAWK.TO ───────────────────────────────────────────
NEXT_PUBLIC_TAWKTO_ID=6a2a9f25f.../1jqr7rbgv                       ← SET ✅

# ── ADMIN DASHBOARD ───────────────────────────────────
ADMIN_PASSWORD="19@George80"                                        ← SET ✅ (changed Session 8 — quote unquoted special chars, see Rule 14)

# ── TELEGRAM BOT (Session 7 — LIVE) ───────────────────
TELEGRAM_BOT_TOKEN=8831963972:AAFopI9...                            ← SET ✅
TELEGRAM_CHAT_ID=1478850085                                         ← SET ✅
```

### Variables that are NO LONGER needed (Green API era — do not re-add)
```
GREEN_API_INSTANCE     ← removed
GREEN_API_TOKEN        ← removed
CALLMEBOT_API_KEY      ← removed
```

---

## Key Rules — Follow These Always

### 1. Server vs Client components
- `app/page.tsx` and `app/product/[id]/page.tsx` are **Server Components** — fetch from Supabase directly
- `app/admin/dashboard/page.tsx` is a **Server Component** — uses `supabaseAdmin` (safe, runs server-side)
- All `components/*.tsx` files are **Client Components** — they have `'use client'` at the top
- API routes (`app/api/**/route.ts`) run on the **server only** — use `supabaseAdmin` here
- `SearchBar.tsx` uses `useSearchParams` — must be wrapped in `<Suspense>` in the parent page

### 2. supabaseAdmin usage
`supabaseAdmin` (service role key) bypasses Row Level Security.
Used in:
- All `app/api/` route files
- `app/admin/dashboard/page.tsx` (Server Component — runs server-side, safe)
- `app/product/[id]/page.tsx` (Server Component — needed so sold products show SOLD overlay)
- `app/admin/products/[id]/edit/page.tsx` (Server Component — fetches product for pre-fill)

Never use `supabaseAdmin` inside client components or lib/ files imported by components.

### 3. Tailwind only — no inline styles
All styling goes through Tailwind classes. Custom reusable classes (`.btn-primary`, `.btn-ghost`, `.badge`, `.price-tag`) are defined in `app/globals.css`. Do not add `style={{}}` props.

### 4. Image handling
All product images go through Cloudinary before being saved to the database.
Never save a temporary Meta media URL or Telegram file URL to Supabase — always upload to Cloudinary first.

### 5. Error handling in the webhook
Both webhooks (`app/api/webhook/route.ts` for Meta, `app/api/telegram/route.ts` for Telegram)
must always return HTTP 200, even on errors. If they return 4xx or 5xx, the platform will
retry repeatedly and can create duplicate products. Log errors to console but return
`{ ok: false }` with status 200.

### 6. Notifications are fire-and-forget
`notifySeller()` catches its own errors internally. Never `await` it in a way that would block the main flow.
As of Session 6, it now logs the HTTP status code and response body if the Meta API returns a non-200.

### 7. Gemini uses REST API directly — not the SDK
`lib/gemini.ts` calls `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`
directly via `fetch`. Do not import from `@google/generative-ai` — it is not installed.

### 8. Admin auth is cookie-based
`lib/auth.ts` checks for `admin_token === 'verified'` cookie. The cookie is set by `/api/admin/login` for 7 days.
Always use `isAdminAuthed()` in Server Components and `isAdminAuthedFromRequest(req)` in API routes.

### 9. HTML Session Log is mandatory — update it every session
`WhatsApp-Estore - Claude Dev Session (14_05_2026).html` in the project root is the primary tutorial record.
It must be updated **verbatim** at the end of every session — every exchange, every code block, every command,
every output, every error, every fix. Nothing summarised. Updated alongside CLAUDE.md and SESSION_LOG.md.

### 10. On-demand revalidation pattern
After any admin action that changes what's visible on the storefront, call `revalidatePath()`:
- Create product → `revalidatePath('/')`
- Edit product → `revalidatePath('/')` + `revalidatePath('/product/${id}')`
- Delete product → `revalidatePath('/')`
This makes changes appear on the storefront immediately without waiting for the 600s fallback interval.

### 11. GitHub / Vercel account at session start
Both GitHub CLI and Vercel CLI must be on the **FAIT-Pro** account.
Check and fix at the start of every session if needed:
```bash
gh auth status           # check active account
gh auth switch --user FAIT-Pro   # switch if wrong
vercel whoami            # check
vercel login             # re-login if wrong account
```
**Known issue (as of Session 7):** `vercel login` keeps authenticating to the wrong account
(seen: `affionbassey-7467`, `fait-blog-3543`) and the correct FAIT-Pro login email is not yet
identified. **Workaround:** this project auto-deploys on git push to `main` via Vercel's
GitHub integration — if `vercel whoami` is wrong, skip `vercel --prod` entirely and just
`git push` (as long as `gh auth status` shows FAIT-Pro). Add/change env vars via the Vercel
**web dashboard** (Settings → Environment Variables), not the CLI, until this is fixed.

### 12. Telegram file downloads — don't trust the Content-Type header
Telegram's file server (`api.telegram.org/file/bot<token>/<file_path>`) always responds with
`Content-Type: application/octet-stream`, regardless of the actual file type. Gemini rejects
that MIME type with a 400 error. `lib/telegram.ts`'s `downloadTelegramFile()` infers the MIME
type from the file extension in `file_path` instead (Telegram photos are always `.jpg`).

### 13. Telegram multi-photo albums — each photo is a SEPARATE webhook call (Session 8)
When a seller selects several photos at once in Telegram, Telegram does NOT send one webhook
call with multiple images. It sends one POST per photo, all sharing the same
`message.media_group_id`, but only one of them carries the caption. Before Session 8 this
created one product PER PHOTO, with price/description landing on only one of them.

Fix, in `app/api/telegram/route.ts`'s `handleAlbumPhoto()`:
1. Each incoming album photo is uploaded to Cloudinary immediately (no Gemini yet), then
   appended to a `telegram_media_groups` row via the atomic `append_telegram_media_group()`
   Postgres function (avoids a read-then-write race when photos arrive milliseconds apart).
2. The handler then waits `MEDIA_GROUP_WAIT_MS` (2000ms) and tries to atomically flip
   `processed = false → true` **only if** the row's `update_count` still matches the value
   it got right after appending. If a later photo bumped the count during the wait, the
   claim's `WHERE` clause matches nothing and this invocation just exits — whichever photo
   turns out to be the last one to arrive is the one whose claim succeeds.
3. Whoever successfully claims the row reads its `image_urls` (all photos collected so far,
   guaranteed up to date because the claim is a single atomic UPDATE) and `caption`, runs
   Gemini on the FIRST photo only (same "first photo → AI, rest → extra" rule as the Admin
   Upload multi-image flow), and inserts ONE product with `wa_message_id = tg_group_<id>`.
4. A photo arriving more than 2s after the rest (rare) is caught by an early `processed`
   check and attached directly to the already-created product via `attachLatePhotoToProduct()`
   instead of creating a duplicate listing.

`export const maxDuration = 60` is set on the route because the debounce wait plus a Gemini
call comfortably exceeds Vercel's 10s default function timeout.

**Setup required:** run the updated `schema.sql` in Supabase → SQL Editor — it adds the
`telegram_media_groups` table and the `append_telegram_media_group()` function. Without this,
multi-photo Telegram uploads will error (single-photo uploads are unaffected).

### 14. Quote env var values that contain `#` in `.env.local` (Session 8)
Next.js's env loader (`@next/env`, dotenv-compatible) treats an unquoted `#` as the start of
a comment — `ADMIN_PASSWORD=FaitGadg3ts#2026` was silently loaded locally as just
`FaitGadg3ts`, dropping `#2026`. This caused admin login to fail locally with the password
documented as correct, while production worked fine (Vercel's dashboard stores env vars as
raw strings with no comment-stripping). Fix: wrap any value containing `#` (or other special
characters) in quotes — `ADMIN_PASSWORD="FaitGadg3ts#2026"`. Verify with:
```bash
node -e "const {loadEnvConfig}=require('@next/env'); loadEnvConfig(process.cwd(), true); console.log(JSON.stringify(process.env.ADMIN_PASSWORD))"
```

### 15. Telegram free-text edit instructions (Session 8)
Editing a Telegram message does NOT re-trigger the webhook — Telegram delivers edits as
`update.edited_message`, and `app/api/telegram/route.ts` only reads `update.message`, so an
edited caption is silently dropped. Before Session 8, sending a brand-new text message that
wasn't exactly `SOLD` was *also* silently dropped — no error, no reply, nothing. This was
reported as a real bug: a seller forgot a price, edited the Telegram caption (no effect),
then sent a new message asking for the price to be added (also no effect, no feedback).

Fix: any text that isn't `SOLD` is now sent to `interpretEditCommand()` (`lib/gemini.ts`)
along with the most-recently-listed product's current details. Gemini decides whether it's
an instruction to change `price`, `name`, `description`, or `category`, and returns
`{ field, value }` (or `{ field: null, value: null }` if it's not an edit instruction at all
— a greeting, a question, etc). The route applies the update via `supabaseAdmin`, calls
`revalidatePath('/')` + `revalidatePath('/product/[id]')`, and **always replies** — either a
confirmation (`✅ Updated price for "..." → ₦165,000`) or a "didn't understand" message with
examples. Never silent, unlike the old behavior.
Targets the most recent product by `created_at` regardless of status (not just `available`,
unlike the `SOLD` command) so a price can still be fixed even if it was mistakenly marked sold.

---

## Known Bugs

All previously known bugs have been fixed:

- ✅ **BUG 1 FIXED (Session 4):** Sold products now show SOLD overlay — product detail page uses `supabaseAdmin`
- ✅ **BUG 2 FIXED (Session 5):** Webhook signature verification active + live tested in production
- ✅ **BUG 3 FIXED (Session 8):** Telegram multi-photo album → was creating one product per photo
  (price/description landing on only one). Fixed via `telegram_media_groups` staging + debounce
  merge — see Rule 13. **Needs `schema.sql` re-run in Supabase before this fix is active.**

No remaining known bugs (pending the schema.sql migration for BUG 3, see above).

---

## Dead Code / Stale Items

None. All previous stale items were resolved in Sessions 4–5.

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
# Ensure correct account
gh auth switch --user FAIT-Pro
vercel whoami   # should show FAIT-Pro

# Deploy to production
vercel --prod
```

Environment variables must also be set in Vercel dashboard:
Project → Settings → Environment Variables

**If `vercel --prod` fails due to wrong account** (see Rule 11): just `git push` to `main` —
Vercel's GitHub integration auto-deploys, no CLI auth needed.

Telegram webhook is registered with:
`https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://fait-gadgets-estore.vercel.app/api/telegram`
(already done as of Session 7 — only re-run this if the bot token changes or the webhook needs resetting)

---

## Seller Commands (current — via Admin Upload Interface)

| Action | What to do |
|---|---|
| List a product | Go to /admin → Add Product → take photo → AI fills details → Publish |
| Mark product sold | Dashboard → Mark Sold button on the product row |
| Edit a product | Dashboard → Edit button → full edit page → Save |

## Seller Commands (live — via Telegram bot, Session 7; free-text edits added Session 8)

| Message sent to Telegram bot | What happens |
|---|---|
| Any image (with or without caption) | Product listed on store immediately (auto-published, `status: 'available'`), Telegram confirmation sent back |
| Several images at once (an album) | Merged into ONE product with all photos attached (Session 8 fix — see Rule 13) |
| Text: `SOLD` | Most recently listed available product marked as sold |
| Any other text, e.g. `price 165000`, `change the name to...` | Interpreted by Gemini as an edit instruction for the MOST RECENTLY LISTED product (any status). Replies with a confirmation, or "didn't understand" if it's not an edit instruction — never silent. See Rule 15. |

**Important:** editing a Telegram message (e.g. editing the caption after sending) does **not** trigger this webhook at all — Telegram delivers that as `update.edited_message`, which is explicitly ignored. Sending a **new** text message is the only way to correct a listing after the fact.

---

## What Has Been Built ✅

- [x] Storefront: product grid, category filter, **live search** (300ms debounce, no reload)
- [x] Individual product page with SOLD overlay logic (uses supabaseAdmin)
- [x] **Request to Buy modal** — buyer enters name + phone → stored in `enquiries` table → seller notified
- [x] **Dedicated product edit page** at `/admin/products/[id]/edit` — full page, mobile-friendly
- [x] WhatsApp webhook — Meta Cloud API (GET verification + POST handler with HMAC-SHA256 auth)
- [x] Gemini 2.5 Flash AI pipeline (image + caption → product name/description/price/category)
- [x] Cloudinary upload pipeline (image → base64 → Cloudinary CDN URL)
- [x] Seller notifications via Meta Cloud API (new listing, like, save, enquiry) with failure logging
- [x] **On-demand revalidation** — storefront updates immediately on every admin publish/edit/delete
- [x] Visitor interaction tracking (view/like/save/enquiry stored in Supabase)
- [x] Deduplication via `wa_message_id` (same WhatsApp message cannot create two products)
- [x] Admin login page with password form
- [x] Admin session cookie (httpOnly, 7 days, cleared on logout)
- [x] Admin dashboard: stats (Live / Drafts / Sold), three-tab product list
- [x] Per-product actions in dashboard:
  - Edit → links to dedicated edit page
  - Draft: Publish / Delete
  - Live: Unpublish / Mark Sold / Copy URL / Delete
  - Sold: Re-list / Delete
- [x] Admin product upload page (`/admin/products/new`):
  - Tap-to-photo / gallery picker (opens camera on mobile)
  - Parallel Cloudinary upload + Gemini AI analysis
  - Fields pre-filled by AI, all editable
  - Save as Draft or Publish Now
- [x] Multi-image support (up to 6 photos per product)
- [x] Image library picker (reuse existing photos, available on upload and edit pages)
- [x] PWA manifest + SVG icon + mobile viewport meta tags
- [x] BUG 1 fixed: sold products show SOLD overlay
- [x] BUG 2 fixed: webhook rejects forged requests (HMAC-SHA256, live tested)
- [x] ADMIN_PASSWORD strengthened to `FaitGadg3ts#2026` (Session 5), changed to `19@George80` (Session 8)
- [x] Tawk.to live chat widget active on storefront
- [x] All code committed, snapshot branch `snapshot-v5-session5-complete` created
- [x] GitHub auth fix: `gh auth switch --user FAIT-Pro` (must be repeated each terminal session)
- [x] `schema.sql` fully up to date with all tables and migrations
- [x] **Telegram bot** (Session 7) — `app/api/telegram/route.ts` + `lib/telegram.ts`, live in production
  - Photo → product listing via existing Gemini + Cloudinary + Supabase pipeline (unchanged)
  - `SOLD` text command, ported from the Meta webhook
  - Live-tested locally via ngrok, then re-tested against production after deploy
  - Found and fixed a bug during testing: Telegram's file server's `application/octet-stream`
    Content-Type broke Gemini — fixed by inferring MIME type from file extension instead
- [x] **Telegram multi-photo album merging** (Session 8) — `handleAlbumPhoto()` in
  `app/api/telegram/route.ts` + `telegram_media_groups` table + `append_telegram_media_group()`
  Postgres function. Sending several photos at once now creates ONE product with all photos
  attached, instead of one product per photo (BUG 3, see Known Bugs)

---

## What Has NOT Been Built Yet ❌

### Next priority — Session 8
- [ ] **Retire Meta WhatsApp Cloud API** — now that Telegram is verified live, swap remaining
  `notifySeller()` calls (likes/saves/enquiries) to `sendTelegramMessage()`, then drop unused
  Meta env vars and webhook code
- [ ] **Resolve Vercel CLI account mismatch** — `vercel whoami` keeps returning the wrong
  account; identify the correct FAIT-Pro login email so `vercel --prod` works again

### Other features
- [ ] Analytics page — use existing `product_stats` Supabase view
- [ ] "Mark specific product as SOLD" by product ID via Telegram/WhatsApp command
- [ ] Email notifications via Resend (alternative/fallback to Telegram)
- [ ] Order / reservation system with payment

---

## Git Branch Strategy

- `main` — production, always deployable
- `snapshot-v5-session5-complete` — stable snapshot before Session 6 changes
- `snapshot-v6-before-telegram` — stable snapshot before Session 7 (Telegram bot) changes

**Rule:** Create a snapshot branch before major changes:
```bash
git checkout -b snapshot-vN-description
git push origin snapshot-vN-description
git checkout main
```

---

## Owner Context

- Store name: FAIT Gadgets
- Seller is based in Nigeria — default currency is NGN (₦)
- Seller phone: Nigerian number stored as `SELLER_PHONE=2347037401412`
- Business is WhatsApp-first; the seller already posts products to WhatsApp Status daily
- The seller is a beginner with coding — keep changes simple and well-commented
- Every file in this project has inline comments explaining what each section does

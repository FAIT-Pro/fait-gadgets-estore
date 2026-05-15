# CLAUDE.md — WhatsApp E-Store Project Guide

This file tells Claude Code everything it needs to know about this project.
Read this fully before making any changes.

---

## What This Project Is

A zero-cost e-commerce storefront that is automatically populated when the seller
(the owner) forwards a product image to a WhatsApp bot number. No manual data entry.
No backend dashboard to manage. The store runs itself.

**The full flow in one sentence:**
Owner forwards WhatsApp image → bot receives it → Gemini AI reads it → product
saved to database → appears on storefront → visitor interacts → owner gets
WhatsApp notification.

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server + client components, API routes |
| Language | TypeScript | Type safety throughout |
| Styling | Tailwind CSS | Utility-first, no separate CSS files needed |
| Database | Supabase (PostgreSQL) | Free tier, real-time, row-level security |
| Image storage | Cloudinary | Free CDN, auto-optimization |
| AI processing | Google Gemini 1.5 Flash | Reads image + caption → structured product data |
| WhatsApp bot | Green API | Receives forwarded messages via webhook |
| Seller notifications | CallMeBot | Sends WhatsApp messages to the seller's phone |
| Live chat | Tawk.to | Widget on storefront, seller replies from phone app |
| Hosting | Vercel | Free, deploys automatically from Git |

---

## Project File Map

```
estore/
│
├── CLAUDE.md               ← YOU ARE HERE
├── SETUP_GUIDE.md          ← Step-by-step account setup for the owner
├── schema.sql              ← Run once in Supabase SQL Editor to create tables
├── .env.example            ← Template for all environment variables
├── .env.local              ← Owner's actual secrets (never commit this)
│
├── package.json            ← Dependencies
├── next.config.js          ← Allows Cloudinary + Green API image domains
├── tailwind.config.js      ← Brand green color + content paths
├── tsconfig.json           ← TypeScript config
├── postcss.config.js       ← Required for Tailwind
│
├── lib/                    ← Shared server-side utilities
│   ├── supabase.ts         ← Two clients: public (storefront) + admin (API routes)
│   │                          Also exports Product and Interaction TypeScript types
│   ├── gemini.ts           ← Calls Gemini 1.5 Flash with image + caption
│   │                          Returns: { name, description, price, currency, category }
│   ├── cloudinary.ts       ← Uploads image URL → returns optimized CDN URL
│   └── notify.ts           ← Sends WhatsApp messages to seller via CallMeBot
│                              Exports: notifySeller(), productListedMessage(), visitorInteractionMessage()
│
├── app/                    ← Next.js App Router pages and API routes
│   ├── globals.css         ← Tailwind base + custom component classes (.btn-primary, .badge, etc.)
│   ├── layout.tsx          ← Root layout: fonts, meta tags, TawkToWidget on every page
│   ├── page.tsx            ← Main storefront: product grid, category filter, search
│   │
│   ├── product/
│   │   └── [id]/
│   │       └── page.tsx    ← Individual product page: full image, description, EnquireButton
│   │
│   └── api/
│       ├── webhook/
│       │   └── route.ts    ← POST: receives Green API webhook
│       │                      Handles image messages → list product
│       │                      Handles "SOLD" text → marks latest product as sold
│       └── track/
│           └── route.ts    ← POST: logs visitor interactions (view/like/save/enquiry)
│                              Notifies seller for like, save, enquiry (not views)
│
└── components/             ← Reusable React components
    ├── ProductCard.tsx     ← Product tile: image, name, price, like/save buttons
    │                          Tracks views on mount, persists like/save in localStorage
    ├── EnquireButton.tsx   ← "Enquire / Buy" button: logs enquiry + opens Tawk.to chat
    └── TawkToWidget.tsx    ← Injects Tawk.to chat bubble script into every page
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
| status | text | 'available' or 'sold' |
| wa_message_id | text | Green API message ID (prevents duplicate listings) |
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

---

## Environment Variables

All required. See `.env.example` for the full list with comments.
Never commit `.env.local` — it contains secrets.

Key variables Claude Code should know about:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — used in browser-safe supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — used ONLY in API routes (server-side), never in components
- `NEXT_PUBLIC_SITE_URL` — used in notification messages to build product links
- `NEXT_PUBLIC_STORE_NAME` — store name shown in header and meta tags
- `NEXT_PUBLIC_TAWKTO_ID` — Tawk.to property ID, loaded by TawkToWidget

---

## Key Rules — Follow These Always

### 1. Server vs Client components
- `app/page.tsx` and `app/product/[id]/page.tsx` are **Server Components** — they fetch from Supabase directly, no `useEffect`, no `useState`
- All `components/*.tsx` files are **Client Components** — they have `'use client'` at the top and handle browser interactions
- API routes (`app/api/**/route.ts`) run on the **server only** — use `supabaseAdmin` here, never the public client

### 2. Never use supabaseAdmin in components
`supabaseAdmin` (service role key) bypasses Row Level Security.
It must ONLY appear inside `app/api/` route files.
Components and pages use the regular `supabase` client.

### 3. Tailwind only — no inline styles
All styling goes through Tailwind classes. Custom reusable classes (`.btn-primary`, `.badge`, `.price-tag`) are defined in `app/globals.css`. Do not add `style={{}}` props.

### 4. Image handling
All product images go through Cloudinary before being saved to the database.
Never save a Green API image URL directly to Supabase — those URLs expire.
Always call `uploadProductImage()` from `lib/cloudinary.ts` first.

### 5. Error handling in the webhook
The webhook (`app/api/webhook/route.ts`) must always return HTTP 200, even on errors.
If it returns 4xx or 5xx, Green API will retry repeatedly and create duplicate products.
Log errors to console but return `{ ok: false }` with status 200.

### 6. Notifications are fire-and-forget
`notifySeller()` catches its own errors internally. Never `await` it in a way
that would block the main product listing flow if CallMeBot is slow or down.

---

## How to Run Locally

```bash
# Install dependencies (first time only)
npm install

# Start local dev server
npm run dev
# → Opens at http://localhost:3000

# Build for production (to check for type errors)
npm run build
```

Requires `.env.local` to be filled in before `npm run dev` works properly.

---

## How to Deploy

```bash
# Deploy to Vercel (first time sets up the project)
vercel

# Deploy to production
vercel --prod
```

Environment variables must also be added in Vercel dashboard:
Project → Settings → Environment Variables

After deploying, set the webhook URL in Green API console:
`https://YOUR-SITE.vercel.app/api/webhook`

---

## Seller Commands (via WhatsApp bot)

| Message sent to bot | What happens |
|---|---|
| Any image (with or without caption) | Product is listed on the store |
| Text: `SOLD` | Most recently listed product is marked as sold |

---

## What Has NOT Been Built Yet (Future Work)

- [ ] Seller dashboard page (view all products, edit prices, delete listings)
- [ ] "Mark specific product as SOLD" command (currently only marks the latest)
- [ ] Bulk upload (multiple images in one message)
- [ ] Order/reservation system
- [ ] Analytics page using the `product_stats` view
- [ ] Admin authentication (protect a /admin route)

---

## Owner Context

- Seller is based in Nigeria — default currency is NGN (₦)
- Business is WhatsApp-first; the seller already posts products to WhatsApp Status daily
- The seller is a beginner with coding — keep changes simple and well-commented
- Every file in this project has inline comments explaining what each section does

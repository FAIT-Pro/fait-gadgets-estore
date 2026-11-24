# Secret Rotation Checklist — FAIT Gadgets E-Store

**Date raised:** 23 Nov 2026 (360° audit)

## Why this is mandatory

The GitHub repository `FAIT-Pro/fait-gadgets-estore` is **public**. Live secret values were
committed in the project documentation (the HTML session log, `CLAUDE.md`, `SESSION_LOG.md`).
Those values were redacted from the current versions of those files, but **git history still
contains them**. Anyone who has ever cloned or forked the repo may already have them.

Redaction is containment, not a fix. **Every secret listed below must be rotated.** Treat any
secret that ever appeared in git history as permanently compromised.

---

## Rotation order

### 1. Telegram bot token + webhook (do these together)

1. Message [@BotFather](https://t.me/BotFather) → `/token` → select the FAIT Gadgets bot →
   choose **Revoke** (this invalidates the leaked token immediately).
2. Copy the new token into both:
   - `.env.local` → `TELEGRAM_BOT_TOKEN=...`
   - Vercel dashboard → Settings → Environment Variables → `TELEGRAM_BOT_TOKEN`
3. Re-register the webhook (the old registration dies with the old token). Use the
   `TELEGRAM_WEBHOOK_SECRET` value already present in `.env.local`:
   ```
   https://api.telegram.org/bot<NEW_TOKEN>/setWebhook?url=https://fait-gadgets-estore.vercel.app/api/telegram&secret_token=<WEBHOOK_SECRET>&drop_pending_updates=false
   ```
   Do **not** set `drop_pending_updates=true` unless the queued messages have been reviewed.
4. Verify with:
   ```
   https://api.telegram.org/bot<NEW_TOKEN>/getWebhookInfo
   ```
   Confirm `url` is the Vercel `/api/telegram` URL and `pending_update_count` is 0 (or expected).

### 2. Telegram webhook secret — ADD TO VERCEL BEFORE PUSHING CODE

`TELEGRAM_WEBHOOK_SECRET` is a **new** variable added by the webhook-auth fix. It exists in
`.env.local`, is registered with Telegram, and was added to Vercel by the owner on 24 Nov 2026
before this push.

- [x] Owner added the value to Vercel (Settings → Environment Variables, all environments).
- Keep the Vercel value identical to `.env.local` and to the `secret_token` used in `setWebhook`.
  The new route rejects every request when the value is missing or mismatched.

### 3. Supabase service-role key

1. Supabase dashboard → Project → Settings → API → **Rotate** the service-role key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel.
3. The anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is designed to be public, but it was also
   redacted from the docs. Rotate it too if you want a clean break: Supabase → Settings → API
   → rotate/refresh anon key, then update **both** `.env.local` and Vercel. It is a
   `NEXT_PUBLIC_*` variable, so a redeploy is required for the new value to reach the browser bundle.
4. Confirm RLS still hides sold/draft products from the anon key after rotation.

### 4. Cloudinary API key and secret

1. Cloudinary dashboard → Settings → API Keys → regenerate the API secret (and key if possible).
2. Update `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env.local` and Vercel.
3. Upload a test photo from `/admin/products/new` to confirm image uploads still work.

### 5. Gemini API key

1. Google AI Studio → API Keys → delete the exposed key → create a new one.
2. Update `GEMINI_API_KEY` in `.env.local` and Vercel.
3. Test with one Telegram photo or the admin analyze step.

### 6. Admin password

1. Choose a new strong password (different from all previous ones).
2. Update `ADMIN_PASSWORD` in `.env.local` and Vercel.
3. If it contains `#` or other special characters, **quote it** in `.env.local`:
   `ADMIN_PASSWORD="Your#Password"` — Next.js's env loader otherwise treats `#` as a comment.
4. Log in at `/admin` to verify.

### 7. Telegram chat ID

`TELEGRAM_CHAT_ID` is an identifier, not a credential, so it cannot be "rotated". It was
redacted anyway. It is now used as an allowlist: only messages from this chat can control the
bot. Confirm it still matches the seller's chat if the seller changes accounts.

---

## After rotation

1. Update Vercel environment variables **first**.
2. Trigger a deploy (push to `main`; Vercel GitHub integration auto-deploys — CLI auth is
   currently broken, so do not rely on `vercel --prod`).
3. Verify in order:
   - `GET https://fait-gadgets-estore.vercel.app/` → 200, products visible
   - `GET /api/admin/images` without a cookie → 401
   - `getWebhookInfo` → correct URL, no errors
   - `POST /api/telegram` with no secret header → `{"ok":false}` (after the code fix is live)
   - Send a real test photo from the seller's Telegram chat → exactly one product appears
4. Consider making the repository private, and/or purging the old secrets from git history
   with `git-filter-repo` or BFG. **Rotation is still required even if history is purged.**

## Note on the queued messages from 23 Nov 2026

Nine queued updates (one 8-photo album plus a product-details text for "SIMGOT SuperMix 4")
were replayed through the web handler before the webhook was re-registered. They produced one
product with 8 photos, price ₦257,000, and the seller's exact name/description. The queue was
then cleared with `drop_pending_updates=true`. No seller data was discarded.

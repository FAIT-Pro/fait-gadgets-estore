# WhatsApp E-Store · Complete Setup Guide

Follow these steps IN ORDER. Each section tells you exactly what to do
and what to copy into your `.env.local` file.

---

## STEP 0 — Install the tools on your computer

You need two programs installed on your computer before you start.

### A. Install Node.js
1. Go to: https://nodejs.org
2. Download the "LTS" version (the one recommended for most users)
3. Run the installer and click through the defaults
4. To confirm it worked: open your terminal (Command Prompt on Windows)
   and type: `node --version` → you should see something like `v20.x.x`

### B. Install Git
1. Go to: https://git-scm.com/downloads
2. Download and install for your operating system
3. Confirm: type `git --version` in terminal

### C. Get the project onto your computer
1. Download the project zip I gave you and unzip it into a folder
   (or if you received a Git link, run: `git clone <link>`)
2. Open your terminal and navigate INTO the folder:
   ```
   cd path/to/estore
   ```
3. Install all the code dependencies:
   ```
   npm install
   ```
   (This downloads ~200MB of code packages — takes 1–3 minutes)

---

## STEP 1 — Supabase (Your Database) · FREE

Think of Supabase as a smart spreadsheet that lives in the cloud,
stores your products, and never goes down.

1. Go to: https://supabase.com and click **Start your project**
2. Sign up with GitHub or email
3. Click **New Project**
   - Give it a name: `estore`
   - Set a strong database password (save this somewhere!)
   - Choose the region closest to Nigeria: `eu-west-1` (Ireland) or `us-east-1`
   - Click **Create new project** (takes ~2 minutes)

4. Once created, go to **Project Settings → API**
   - Copy **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon / public key** → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role (secret) key** → this is your `SUPABASE_SERVICE_ROLE_KEY`

5. Now create the database tables:
   - Go to **SQL Editor** in the left sidebar
   - Click **New Query**
   - Open the file `schema.sql` from your project folder
   - Copy ALL of its contents and paste into the SQL editor
   - Click the **Run** button (green triangle)
   - You should see "Success. No rows returned"

---

## STEP 2 — Cloudinary (Image Storage) · FREE

Cloudinary stores your product photos and serves them fast worldwide.

1. Go to: https://cloudinary.com and click **Sign Up For Free**
2. Verify your email
3. On the **Dashboard**, you'll see your credentials at the top:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`
4. That's it! You get 25GB storage for free.

---

## STEP 3 — Google Gemini AI (Product Extraction) · FREE

Gemini reads your product photos and extracts the name, price, and description.

1. Go to: https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API key** in the top right
4. Click **Create API key in new project**
5. Copy the key → this is your `GEMINI_API_KEY`

Free tier: 15 requests per minute, 1 million tokens per day.
For a small store this is essentially unlimited.

---

## STEP 4 — Green API (WhatsApp Bot) · FREE

Green API connects a WhatsApp number to your system.
When you forward a product image to this number, it triggers your bot.

**Important:** You need a second SIM / phone number for this.
It can be a cheap data-only SIM. You'll install WhatsApp on it.

1. Go to: https://console.green-api.com
2. Click **Sign Up** and verify your email
3. Click **Create Instance** (choose FREE plan)
4. On your instance page, click **Scan QR Code**
5. Open WhatsApp on the SECOND number/phone and scan the QR code
   (just like setting up WhatsApp Web)
6. Once connected, copy:
   - **idInstance** → this is your `GREEN_API_INSTANCE`
   - **apiTokenInstance** → this is your `GREEN_API_TOKEN`

7. After deployment (Step 7), come back here and set your webhook URL:
   - Go to your instance → **Settings** → **Notifications**
   - Enable: **Incoming messages**
   - Set Webhook URL: `https://YOUR-SITE.vercel.app/api/webhook`

---

## STEP 5 — CallMeBot (WhatsApp Notifications to You) · FREE

CallMeBot lets the system send messages to YOUR personal WhatsApp number.

1. Save this contact on your phone:
   - Name: `CallMeBot`
   - Number: `+34 644 49 78 62`

2. Send this exact message to that contact on WhatsApp:
   ```
   I allow callmebot to send me messages
   ```

3. You'll receive a reply with your API key in a few minutes.
   It looks like: `Your APIKEY is 123456`

4. Copy that number → this is your `CALLMEBOT_API_KEY`
5. Your own WhatsApp number (with country code, no +) → `SELLER_PHONE`
   Example: Nigerian number 0801 234 5678 → write `2348012345678`

---

## STEP 6 — Tawk.to (Live Chat Widget) · FREE

Tawk.to lets visitors chat with you from your website.
You reply from the Tawk.to phone app — it feels just like WhatsApp.

1. Go to: https://www.tawk.to and click **Sign Up Free**
2. Give your property a name (your store name) and website URL
3. Click **Create Property**
4. Go to **Administration → Property Settings**
5. Find the **Widget Code** — it looks like a script tag
6. Inside that script, find the URL: `https://embed.tawk.to/XXXXXXXXX/YYYYY`
7. Copy everything after `embed.tawk.to/` (the `XXXXXXXXX/YYYYY` part)
   → this is your `NEXT_PUBLIC_TAWKTO_ID`
8. Download the Tawk.to app on your phone so you can reply to chats

---

## STEP 7 — Vercel (Hosting) · FREE

Vercel will host your store on the internet for free.

1. Go to: https://vercel.com and click **Sign Up**
   (Sign up with GitHub — it's the easiest option)

2. Install the Vercel CLI on your computer:
   ```
   npm install -g vercel
   ```

3. In your terminal, inside the project folder, log in:
   ```
   vercel login
   ```

4. Deploy the project:
   ```
   vercel
   ```
   - When it asks "Set up and deploy?" → press Enter (Yes)
   - When it asks "Which scope?" → choose your account
   - When it asks "Link to existing project?" → No
   - Project name: `my-estore` (or anything you like)
   - Directory: `./` (press Enter)
   - It will give you a URL like `https://my-estore.vercel.app`
   - Copy this URL → this is your `NEXT_PUBLIC_SITE_URL`

5. Now add your environment variables to Vercel:
   Go to: https://vercel.com → your project → **Settings → Environment Variables**
   Add each variable from your `.env.local` file one by one.

6. After adding variables, redeploy:
   ```
   vercel --prod
   ```

---

## STEP 8 — Create your .env.local file

In your project folder, duplicate `.env.example` and rename it `.env.local`.
Then fill in all the values you collected in Steps 1–6.

```
NEXT_PUBLIC_SUPABASE_URL=         (from Step 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY=    (from Step 1)
SUPABASE_SERVICE_ROLE_KEY=        (from Step 1)
CLOUDINARY_CLOUD_NAME=            (from Step 2)
CLOUDINARY_API_KEY=               (from Step 2)
CLOUDINARY_API_SECRET=            (from Step 2)
GEMINI_API_KEY=                   (from Step 3)
GREEN_API_INSTANCE=               (from Step 4)
GREEN_API_TOKEN=                  (from Step 4)
SELLER_PHONE=                     (from Step 5)
CALLMEBOT_API_KEY=                (from Step 5)
NEXT_PUBLIC_STORE_NAME=My Store   (change to your store name)
NEXT_PUBLIC_SITE_URL=             (from Step 7)
NEXT_PUBLIC_TAWKTO_ID=            (from Step 6)
WEBHOOK_SECRET=anything-random    (just make something up)
```

**To test locally** (on your computer before deploying):
```
npm run dev
```
Then open: http://localhost:3000

---

## STEP 9 — Test the full flow!

1. Open WhatsApp on your personal phone
2. Forward any product image to the second number (your bot number)
3. Add a caption like: "Red leather handbag ₦8,500"
4. Wait 15–30 seconds
5. Check your store at https://YOUR-SITE.vercel.app
   → The product should appear!
6. You should also receive a WhatsApp notification confirming the listing.

---

## Day-to-day usage

**To list a product:**
1. Post on your WhatsApp Status as normal
2. Forward the same post to your bot number
3. Product appears on your store automatically ✅
4. You receive a WhatsApp confirmation ✅

**To mark a product as SOLD:**
1. Send the text "SOLD" to your bot number
2. It will mark your most recently listed item as sold ✅

**To reply to customer enquiries:**
- Open the Tawk.to app on your phone
- Reply just like WhatsApp
- Your reply appears instantly on the website for the visitor ✅

---

## Need help?

Bring any error message or question to Claude and I'll help you debug it.

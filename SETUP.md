# eetee Sports — Setup Guide

**Updated 2026-08-14:** this site now reads/writes the same Turso database as the `eetee-cards-app` desktop app, instead of its own Airtable base. The steps below are kept for historical reference (Cloudinary/Anthropic setup is unchanged); Step 3 (Airtable) is obsolete — see "Turso Details" near the bottom instead.

---

## Step 1 — Get an Anthropic API Key (for card identification)

1. Go to https://console.anthropic.com/settings/keys
2. Sign in or create an account
3. Click **Create Key**, give it a name like "eetee-cards"
4. Copy the key (starts with `sk-ant-...`) — you'll need it in Step 4

---

## Step 2 — Set Up Cloudinary (for photo storage — no phone storage needed)

1. Go to https://cloudinary.com and create a free account
2. After signing in, note your **Cloud Name** from the dashboard (top left)
3. Go to **Settings → Upload → Upload Presets**
4. Click **Add upload preset**
   - Set **Signing Mode** to **Unsigned**
   - Set **Folder** to `eetee-cards`
   - Name it `eetee-cards-unsigned`
   - Click **Save**
5. You'll need your Cloud Name and the preset name in Step 4

---

## Step 3 — Turso database (obsolete Airtable step, kept for history)

This site no longer uses Airtable. It reads/writes the same Turso database
as the `eetee-cards-app` desktop app — copy `TURSO_DATABASE_URL` and
`TURSO_AUTH_TOKEN` straight out of that app's `.env.local` rather than
creating new credentials. Nothing to sign up for here.

---

## Step 4 — Deploy to Vercel (free hosting)

1. **Create a GitHub account** at https://github.com if you don't have one
2. **Create a new repository** on GitHub called `eetee-cards`
3. **Upload this folder** (`eetee-cards-app`) to the repository
   - On the repo page, click **Add file → Upload files**
   - Drag the entire `eetee-cards-app` folder contents in
4. **Go to https://vercel.com** and sign in with GitHub
5. Click **Add New Project**, select your `eetee-cards` repo
6. Under **Environment Variables**, add these 4 variables:

   | Variable | Value |
   |----------|-------|
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` key |
   | `TURSO_DATABASE_URL` | same value as in `eetee-cards-app/.env.local` |
   | `TURSO_AUTH_TOKEN` | same value as in `eetee-cards-app/.env.local` |
   | `NEXTAUTH_SECRET` | any long random string (admin login session signing) |
   | `ADMIN_PASSWORD` | the password for Evan's own /login |
   | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
   | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | `eetee-cards-unsigned` |
   | `EBAY_APP_ID` / `EBAY_CERT_ID` | only needed if using the eBay comp-price lookup in the AI valuation flow |

7. Click **Deploy** — Vercel will build and give you a URL like `eetee-cards.vercel.app`

---

## That's it!

Your app will be live at your Vercel URL. Open it on your phone and go to **Add Card** to start logging your collection.

**Photo flow:** Tap "Take Photo" → camera opens → snap the card → photo uploads directly to Cloudinary (not your camera roll) → AI identifies the card automatically.

**Voice flow:** Tap "Start Listening" → say something like "2017 Panini Prizm Patrick Mahomes Silver Rookie number 269" → AI fills in all the fields.

---

## Turso Details (shared with eetee-cards-app)

- **Database:** the same one `eetee-cards-app` migrated ~1,730 CDP-imported
  cards into on 2026-08-13 (see that app's `scripts/migrate-to-turso-full.mjs`).
- **Table:** `cards`, plus a growing set of value/price/listing tables the
  desktop app also uses — this site only reads/writes `cards`.
- The old Airtable base (`app5got9RZ5o2iczD`, table `Cards`) is no longer
  used by this site as of 2026-08-14. It held ~25 test records, not the
  real inventory, so nothing was migrated out of it.
- To browse/edit the data directly, use Turso's own dashboard
  (turso.tech) or `eetee-cards-app`'s own UI — not Airtable anymore.

---

## Running Locally (optional, for development)

If you have Node.js installed:

```bash
cd eetee-cards-app
cp .env.local.example .env.local
# Fill in .env.local with your keys
npm install
npm run dev
```

Then open http://localhost:3000

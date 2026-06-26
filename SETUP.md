# eetee Sports — Setup Guide

Your Airtable database is already created and wired in. You need 3 free accounts and ~20 minutes to get this live.

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

## Step 3 — Get an Airtable Personal Access Token

1. Go to https://airtable.com/create/tokens
2. Click **Create new token**
3. Name it "eetee-cards"
4. Add scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
5. Under **Access**, select **All current and future bases**
6. Click **Create token** and copy it (starts with `pat...`)

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
   | `AIRTABLE_API_KEY` | your `pat...` token |
   | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
   | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | `eetee-cards-unsigned` |

7. Click **Deploy** — Vercel will build and give you a URL like `eetee-cards.vercel.app`

---

## That's it!

Your app will be live at your Vercel URL. Open it on your phone and go to **Add Card** to start logging your collection.

**Photo flow:** Tap "Take Photo" → camera opens → snap the card → photo uploads directly to Cloudinary (not your camera roll) → AI identifies the card automatically.

**Voice flow:** Tap "Start Listening" → say something like "2017 Panini Prizm Patrick Mahomes Silver Rookie number 269" → AI fills in all the fields.

---

## Airtable Details (already created for you)

- **Base:** eetee Card Collection
- **Base ID:** app5got9RZ5o2iczD
- **Table:** Cards

You can view and edit your cards directly in Airtable at https://airtable.com anytime.

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

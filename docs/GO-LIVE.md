# VLSI Forge — GO LIVE Guide

This guide takes the project from "runs on my laptop" to "anyone can use it on a real
website name and download it from the Play Store."

> ⚠️ None of this can be done from a locked company laptop (no installs / no admin).
> Do it from a **personal computer** with internet access.

There are 3 stages. Do them in order.

---

## Stage 1 — Put the backend + website online (so it has a public URL)

You will use **Render.com** (free tier). The repo already contains `render.yaml`,
`backend/Dockerfile`, and the static `web/` site.

1. Push this whole project to a **GitHub** repository.
2. Create a free account at https://render.com and connect your GitHub.
3. Click **New → Blueprint**, pick your repo. Render reads `render.yaml` and creates:
   - a free **Postgres** database,
   - the **vlsi-forge-api** backend,
   - the **vlsi-forge-web** website.
4. When the API is live, note its URL, e.g. `https://vlsi-forge-api.onrender.com`.
5. When the website is live, note its URL, e.g. `https://vlsi-forge-web.onrender.com`.
6. In the Render dashboard, open **vlsi-forge-api → Environment** and set:
   - `CORS_ORIGINS` = your website URL (e.g. `https://vlsi-forge-web.onrender.com`).
7. Edit `web/index.html` → set `window.VLSI_API_BASE` to your API URL + `/api/v1`,
   e.g. `https://vlsi-forge-api.onrender.com/api/v1`. Commit & push (Render redeploys).

### Load the content into the cloud database (one time)
On your personal computer, from the `backend/` folder:
```bash
pip install -r requirements.txt
# Use the SAME Postgres URL Render created (copy from the database's "External URL"):
setx DATABASE_URL "postgresql+psycopg://...render-external-url..."   # Windows
python scripts/import_content.py \
  --subjects ../docs/seed/subjects.json \
  --notes ../docs/seed/notes.json \
  --tutorials ../docs/seed/tutorials.json \
  --mcqs ../docs/seed/mcqs_*.json \
  --coding ../docs/seed/coding*.json
```
After this, open your website URL — it now works for anyone on the internet.

---

## Stage 2 — Give it a website NAME (domain)

1. Buy a domain (e.g. from Namecheap / GoDaddy / Cloudflare) such as `vlsiforge.app`
   (~₹700–1500/year).
2. In Render → **vlsi-forge-web → Settings → Custom Domains**, add your domain.
3. Add the DNS records Render shows you at your domain provider.
4. Wait for it to verify (HTTPS is automatic). Now typing **vlsiforge.app** opens the app.
5. Update `CORS_ORIGINS` (Stage 1.6) and `window.VLSI_API_BASE` host if you also put the
   API on a subdomain like `api.vlsiforge.app`.

---

## Stage 3 — Publish the Android app to the Play Store

You have two options. **Option A is simplest.**

### Option A — Wrap the website as an Android app (PWA → TWA), no coding
1. Make sure the website (Stage 1/2) is live over HTTPS.
2. Go to https://www.pwabuilder.com and enter your website URL.
3. Click **Package for stores → Android**. It generates a signed `.aab` using your
   `manifest.webmanifest` and icon.
4. Create a **Google Play Console** account (one-time $25): https://play.google.com/console
5. Create an app, upload the `.aab`, fill the listing using `docs/store-listing.md`,
   add the privacy policy URL `https://YOUR-DOMAIN/privacy.html`, set content rating,
   and submit for review.

### Option B — Build the native Expo app with EAS (more control)
On a personal computer with **Node.js** installed:
```bash
cd mobile
npm install
npm install -g eas-cli
eas login                     # create a free Expo account
# Point the app at your live API:
setx EXPO_PUBLIC_API_BASE_URL "https://vlsi-forge-api.onrender.com/api/v1"
eas build -p android --profile production   # cloud build, returns an .aab
```
Then upload the `.aab` to Google Play Console as in Option A, steps 4–5.

---

## Quick checklist
- [ ] Project pushed to GitHub
- [ ] Render Blueprint deployed (db + api + web)
- [ ] `CORS_ORIGINS` set to website URL
- [ ] `window.VLSI_API_BASE` set to API URL
- [ ] Content imported into cloud Postgres
- [ ] Domain bought and connected
- [ ] Privacy policy reachable at /privacy.html
- [ ] `.aab` built (PWABuilder or EAS)
- [ ] Google Play Console app created and submitted

## What it costs
- Hosting: free tier to start (Render free dynos sleep when idle).
- Domain: ~₹700–1500/year.
- Google Play: $25 one-time.

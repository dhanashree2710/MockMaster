# MockMaster — Launch guide (do these in order)

Everything that can be done in code is done. The steps below need **your** accounts
(Supabase, hosting, Google Play), so they cannot be automated from this package.

## What was fixed in this build
| Area | Before | Now |
|---|---|---|
| Login | custom table, unsalted SHA-256, hashes readable by anyone with the public key | **Supabase Auth**; no password column; email confirm + forgot/reset password |
| Database | open/broken RLS | strict owner-only RLS, `anon` has zero access (`supabase/schema.sql`) |
| Account deletion | missing (Play violation) | in-app (Settings) + public page `pages/delete-account.html` + `delete_my_account()` |
| Privacy policy | placeholder, unlinked | full policy, linked from sign-up (required consent checkbox), Settings, home |
| AI | users had to bring their own key | server proxy (`supabase/functions/ai-chat`): key stays server-side, login required, rate limited |
| AI-content policy | none | "Report a problem with AI content" → `content_reports` table |
| XSS | 65 `innerHTML`, 3 escapes | `safe-html.js` sanitizer on every page + escaped templates |
| Offline / slow network | CDN libs uncached | service worker v3 caches app shell + CDN libs; `vendor_assets.py` can self-host them |
| Bugs | `</script>` inside a comment broke ATS page; credits re-granted at 0 | both fixed |
| Cleanup | demo pages, empty folders | removed |
| CDN / Google Fonts | 10 third-party URLs (IP leak to Google, offline failures) | all self-hosted in `vendor/`, CSP tightened |
| Fake data | "John Doe" resume shown to users with no upload | real empty state / generic fallback questions |
| Packaging | none | `twa/` Bubblewrap config, `assetlinks.json`, `_headers` (CSP etc.), `.nojekyll` |

## STEP 1 — Supabase (≈15 min)
1. SQL Editor → paste & run all of `supabase/schema.sql` (read its top comment first).
   Check the final policy list: **none for role `anon`**.
2. Authentication → follow the table in `SUPABASE_SETUP.md` (Site URL, Redirect URLs).
3. If this project also hosts another app (your pasted schema had `profiles`, `courses`,
   `purchases`, `certificates`…), enable RLS + policies on **those** tables too.
4. Deploy the AI function — see `OPENAI_SETUP.md` (`supabase secrets set GROQ_API_KEY=…`,
   `supabase functions deploy ai-chat`).
5. Set `ALLOWED_ORIGIN` to your hosted URL after step 2.

## STEP 2 — Fill in your details (1 command)
```bash
python3 scripts/configure.py --email support@yourdomain.com --host app.yourdomain.com \
        --package com.yourname.mockmaster
python3 scripts/prelaunch_check.py --fix   # removes legacy/demo files, then audits; must end with 0 fail
# (GitHub: .github/workflows/prelaunch.yml runs the same audit on every push)
```
(The SHA-256 fingerprint comes later, in Step 5.)

## STEP 3 — Self-hosted libraries ✅ DONE
Bootstrap, icons, Supabase JS, Chart.js, jsPDF, PDF.js, Mammoth and the Inter font are in `vendor/`
(pinned versions, no CDN or Google Fonts calls; the CSP in `_headers` no longer allows them).
Keep the `vendor/` folder when you deploy. Re-check any time: `python3 scripts/vendor_assets.py --check`.

## STEP 4 — Host over HTTPS **at the domain root**
Cloudflare Pages / Firebase Hosting / any static host. `_headers` supplies the
security headers (Cloudflare format — copy them into your server config otherwise).
**Test the live site** (sign up, upload resume, interview with voice, report, delete test account).
The CSP is strict: if something is blocked, the browser console names the host to add.

## STEP 5 — Build the Android app (Trusted Web Activity)
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://app.yourdomain.com/manifest.webmanifest   # compare with twa/twa-manifest.json
bubblewrap build                                                             # creates app-release-bundle.aab
```
* Keep the keystore + passwords safe (back them up!). `packageId` can never change.
* Upload the `.aab` to Play Console and enable **Play App Signing**.
* Play Console → Setup → App signing → copy the **SHA-256 certificate fingerprint**, then:
  `python3 scripts/configure.py --sha256 "AA:BB:…"` and **re-deploy the site** so
  `https://app.yourdomain.com/.well-known/assetlinks.json` is live. Without it the app shows a
  browser URL bar instead of full-screen.
* Check the file in a browser; it must load as JSON.

## STEP 6 — Play Console forms (copy from `store/`)
* `store/store-listing.md` – texts, graphics list, content rating, audience (18+), reviewer login
* `store/data-safety.md` – Data safety answers (+ deletion URL)
* Privacy policy URL: `https://app.yourdomain.com/pages/privacy.html`

## STEP 7 — Test before production
* Internal test → real low-end Android phone, mobile data: sign-up, voice answer (microphone permission prompt), AI questions, report, delete account.
* New personal developer accounts must run a **closed test with a minimum number of testers for a minimum number of days** before production access. Check the current numbers in Play Console (Dashboard → "Set up your app / Testing requirements") — they change.

## Known limits (not blockers)
* Credits are stored on the device/profile and have no cash value. If you ever sell anything digital you must use Google Play Billing and verify purchases server-side.
* Voice answers need a Chrome-based TWA (that is why TWA, not a plain WebView wrapper, is recommended).
* The service worker caches only app files and public libraries — never API calls.

# MockMaster — Launch readiness (audited 16 Oct 2026)

**Verdict: code is launch-ready; the Play submission is blocked only by items that need YOUR accounts.**

## Verified in this audit
* Automated audit `scripts/prelaunch_check.py`: 22 pass / 0 fail with placeholders allowed.
* All 24 pages loaded in headless Chromium (mobile viewport) under the production CSP: 0 JS errors, 0 CSP violations, 0 missing files.
* Logged-out access shows the login overlay; logged-in-without-resume shows an empty state (no fake data).
* No API keys / service-role keys in the tree or in git history (anon key is public by design; RLS protects data).

## Fixed in this pass
CDN + Google Fonts removed (self-hosted), CSP tightened, service worker v3.1 caches the local libraries,
fake "John Doe" fallback data removed, demo/legacy files deleted, audit script taught about `vendor/`,
feature graphic and 6 phone screenshots generated.

## Still required from you (cannot be done in code)
1. `python3 scripts/configure.py --email … --host … --package …` (real domain, support email, permanent package id).
2. Run `supabase/schema.sql`, deploy the `ai-chat` function + `GROQ_API_KEY` secret (see OPENAI_SETUP.md / SUPABASE_SETUP.md); set Auth redirect URLs.
3. Host over HTTPS at the domain root (Netlify/Cloudflare Pages) and test sign-up, resume upload, voice interview, report, delete account.
4. `bubblewrap build` → upload the .aab, enable Play App Signing, then `configure.py --sha256 …` and redeploy `assetlinks.json`.
5. Fill Play Console forms from `store/`, add reviewer test login, run the required closed test (testers/days requirement set by Google), then release.
6. Final run before release: `python3 scripts/prelaunch_check.py` must say **0 fail**.

## Risks worth knowing
* The login guard is client-side; real protection is Supabase RLS — run the schema and confirm no `anon` policies.
* Voice answers rely on the device's speech recognition (Chrome TWA); test on a low-end phone.
* The AI proxy is rate limited (20/hour, 80/day per user); set `ALLOWED_ORIGIN` to your domain.

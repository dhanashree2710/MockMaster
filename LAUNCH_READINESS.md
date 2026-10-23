# MockMaster — Launch readiness (updated 23 Oct 2026)

**Status: code issues fixed except the password-reset design (kept on purpose, see below).
Remaining blockers need YOUR accounts/values.**

## Fixed in this pass
* **Payments are now verified on the server.** `razorpay-order` (price decided server-side) →
  Razorpay Checkout → `razorpay-verify` (HMAC signature + payment lookup) → row in `reward_purchases`.
  The browser can no longer grant itself a paid unlock: the unlock list is overwritten from the server
  on login/dashboard and when opening Rewards; the old client-writable "redeemed" sync was removed;
  the "free credits unlock" fallback was removed.
* **Play Billing policy:** paid unlocks are disabled inside the Android (TWA) app
  (`paidUnlocksInPlayApp: false`); they work on the website only. Data-safety, privacy page and Play docs updated.
* Removed dev/demo leftovers, legacy SQL files (incl. the one that created `password_hash`) and stale duplicate
  `config.js` / `supabase-client.js` in the project root.
* Auditor taught about payments and the public `reset-password.html` page.

## Interview quality (added)
* **Questions** are now generated from the full resume (all skills, up to 5 jobs with bullets, up to 6 projects with
  tech + description) and the JD, and every technical/project/resume question must name what it is based on.
  Questions about skills, projects or companies that are not in the resume/JD are dropped automatically.
* **Report answers** are now graded by AI per question (batches of 5, with resume + JD context): score, specific
  feedback, and a suggested answer written for THAT question (resume/project answers use the candidate's real
  facts with placeholders for numbers). If AI is unavailable, project/experience questions get a resume-based
  template, and keyword-bank answers are no longer used for project/resume questions.
* Uses ~1 AI call to generate + 1 per 5 answers at the end (limit is 20/hour per user).

## Deliberately NOT changed
* **Password reset (email + new password, no verification).** Kept as requested. Known risk: anyone who knows
  an email can change that account's password. Limit is 5 resets/email/hour (SQL) — it does not stop a
  targeted takeover. Consider an email link/OTP later.

## Still required from you (cannot be done in code)
1. `python3 scripts/configure.py --email … --host … --package … --razorpay-key rzp_live_…`
2. Run `supabase/schema.sql`; deploy `ai-chat`, `razorpay-order`, `razorpay-verify`; set secrets
   (`GROQ_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ALLOWED_ORIGIN`) — see SUPABASE_SETUP.md.
3. Test with Razorpay TEST keys first: pay → unlock → row in `reward_purchases`; cancel; bad card.
4. Host over HTTPS at the domain root; test sign-up, resume upload, voice interview, report, delete account.
5. `bubblewrap build` → upload .aab → Play App Signing → `configure.py --sha256 …` → redeploy `assetlinks.json`.
6. Play Console forms from `store/`, reviewer test login, closed test, release.
7. Final: `python3 scripts/prelaunch_check.py` must say **0 fail**.

## Known limits
* Premium content (e.g. the Tier-1 question list) is static text in the page, so a determined user can read it
  from the page source without paying. Payment and unlock state are server-verified, but only moving the content
  itself to the server would fully protect it.
* If Razorpay auto-capture is off, authorized-but-uncaptured payments are accepted by `razorpay-verify`
  and Razorpay may auto-refund them later; keep auto-capture ON.
* Login guard is client-side; real protection is Supabase RLS.
* Voice answers rely on device speech recognition (Chrome TWA); test on a low-end phone.

# Supabase setup (Supabase Auth + strict RLS)

## 1. Project
Use your existing project (URL/anon key are already in `assets/js/supabase-client.js`)
or create a new one and paste its **Project URL** + **anon public** key there.
The anon key is public by design; security comes from RLS.

## 2. Run the database script
SQL Editor → paste the **whole** `supabase/schema.sql` → Run.

* Read the comment block at the top first. Old test users made with the previous
  custom login cannot sign in any more (passwords now live in Supabase Auth).
  Delete them (`DELETE FROM public.users;`) or have them sign up again.
* At the bottom the script prints every policy. **You must see no policy for role
  `anon`, and nothing named `demo_*` or `*_for_login`.**
* The script only touches MockMaster tables. If this project also hosts another app
  (e.g. a course platform with `profiles`, `courses`, `purchases`…), check **those**
  tables have RLS enabled too: *Table Editor → each table → "RLS enabled"*.

## 3. Deploy the edge functions (AI + payments)

```
supabase functions deploy ai-chat
supabase functions deploy razorpay-order
supabase functions deploy razorpay-verify
supabase secrets set GROQ_API_KEY=gsk_xxx
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx
supabase secrets set ALLOWED_ORIGIN=https://YOUR-HOST      # your real domain
```
* The Razorpay **secret** lives only here, never in the app. The app only has the public key id.
* Prices are decided in `razorpay-order/index.ts` (`PRICES_INR`) — keep them equal to `Utils.REWARDS` in `assets/js/utils.js`.
* Use `rzp_test_…` keys while testing, then switch to live keys and run
  `python3 scripts/configure.py --razorpay-key rzp_live_xxx`.

**Forgot password** — see PASSWORD_RESET_GUIDE.md.

## 4. Test checklist (do this before submitting)
1. Sign up → new row in Table Editor → `users` → dashboard (no email link).
2. Upload a resume → refresh → it is still there (proves insert/select RLS works).
3. Second account: confirm it can **not** see the first account's data.
4. Settings → Delete account → you are signed out; the user is gone from
   Authentication → Users and `public.users`.
5. Pay for one report with a Razorpay TEST card → it unlocks, and a row appears in `reward_purchases`. Edit `mm_redeemed` in DevTools → on the next visit to Rewards it is reset from the server.
6. With the anon key only (no login) try
   `curl "$SUPABASE_URL/rest/v1/users?select=*" -H "apikey: $ANON"` → must return `[]` or 401/permission error.

## Page → table map
| Page | Tables |
|---|---|
| login / signup / reset | Supabase Auth, `users` (auto-created by trigger), `user_progress` |
| dashboard / progress | `user_progress`, `interview_sessions`, `interview_reports` |
| upload-resume / analysis | `resumes`, `resume_profiles` |
| job-description / match | `job_descriptions`, `match_results` |
| preparation-plan | `preparation_plans` |
| interview setup / run / report | `interview_sessions`, `interview_questions`, `interview_answers`, `interview_reports`, `content_reports` |
| AI proxy | `ai_usage_log` (service role only) |
| rewards / payments | `reward_purchases` (read-only for the user), `razorpay_orders` (service role only) |

## Frontend API
`window.DB` in `assets/js/supabase-client.js`:
`register`, `login`, `signOut`, `resetPassword`, `updatePassword`, `deleteAccount`,
`reportContent`, `createResume`, `createJob`, `saveMatch`, `createSession`, `saveReport`, …

## Password reset (email + new password)

Run `supabase/schema.sql` in the SQL Editor. Details and security notes: `PASSWORD_RESET_GUIDE.md`.

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

## 3. Authentication settings (Dashboard → Authentication)
| Setting | Value |
|---|---|
| Providers → Email | enabled |
| **Confirm email** | **OFF** (required) — users sign in immediately after create account; no confirmation email |
| URL Configuration → Site URL | your hosted HTTPS URL, e.g. `https://app.yourdomain.com` |
| URL Configuration → Redirect URLs | include `https://app.yourdomain.com/pages/login.html` |
| Password strength | min length 8 (match the app) |
| Rate limits / CAPTCHA | turn on CAPTCHA (hCaptcha/Turnstile) if you see sign-up abuse |

### Turn off email confirmation (do this once)
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project  
2. **Authentication** → **Providers** → **Email**  
3. Disable **“Confirm email”** (or “Enable email confirmations”)  
4. Save  

Without this, new users get no session until they open a link in their inbox.

**Forgot password** (email + new password) — run `supabase/schema.sql` once (see PASSWORD_RESET_GUIDE.md).

## 4. Test checklist (do this before submitting)
1. Sign up → land on dashboard immediately (no email confirm step).
2. Upload a resume → refresh → it is still there (proves insert/select RLS works).
3. Second account: confirm it can **not** see the first account's data.
4. Settings → Delete account → you are signed out; the user is gone from
   Authentication → Users and `public.users`.
5. With the anon key only (no login) try
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

## Frontend API
`window.DB` in `assets/js/supabase-client.js`:
`register`, `login`, `signOut`, `resetPassword`, `updatePassword`, `deleteAccount`,
`reportContent`, `createResume`, `createJob`, `saveMatch`, `createSession`, `saveReport`, …

## Password reset (email + new password)

Run `supabase/schema.sql` in the SQL Editor. Details and security notes: `PASSWORD_RESET_GUIDE.md`.

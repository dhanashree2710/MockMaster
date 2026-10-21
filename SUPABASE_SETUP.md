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
| Confirm email | ON is recommended (the app handles it). OFF = instant sign-in. |
| URL Configuration → Site URL | your hosted HTTPS URL, e.g. `https://app.yourdomain.com` |
| URL Configuration → Site URL | your hosted HTTPS URL, e.g. `https://app.yourdomain.com` |
| URL Configuration → Redirect URLs | **Must include** `https://app.yourdomain.com/pages/reset-password.html` and `https://app.yourdomain.com/pages/login.html` (Forgot password will fail without these) |
| Password strength | min length 8 (match the app) |
| Rate limits / CAPTCHA | turn on CAPTCHA (hCaptcha/Turnstile) if you see sign-up abuse |

**Password reset checklist**
1. Add `…/pages/reset-password.html` under Authentication → URL Configuration → Redirect URLs.
2. Save, then on the app: enter email on Sign in → **Forgot password**.
3. Open the email link (check Spam). You land on “Set a new password” → enter password twice → **Update password**.
4. Sign in with the new password.
5. Logged-in users can also change password under **Settings → Change password**.

(Optional) Customise the confirmation / reset email templates with your app name.

## 4. Test checklist (do this before submitting)
1. Sign up → (confirm email) → sign in → dashboard loads.
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

## Password reset (in-app, no email link)

Deploy the Edge Function so users can set a new password from **Forgot password**:

```bash
supabase functions deploy reset-password --no-verify-jwt
```

Optional: `supabase secrets set ALLOWED_ORIGIN=https://your-domain.com`

Flow: Login → Forgot password → enter email + new password → Save → Sign in with new password.

Logged-in users can also change password in **Settings**.

## Password reset without Supabase CLI (recommended on Windows)

If the site is on **Netlify**:

1. Supabase Dashboard → **Settings → API** → copy **Project URL** and **service_role** key (secret).
2. Netlify → your site → **Site configuration → Environment variables**:
   - `SUPABASE_URL` = `https://uajfitgssxwgbgaueeex.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (service_role key)
3. **Trigger deploy** (Deploys → Trigger deploy) so the function picks up the env vars.
4. Open app → Forgot password → email + new password → Save → Sign in.

The function file is `netlify/functions/reset-password.js` (ships with the app).

Logged-in users can always change password in **Settings** (no server setup).


# Supabase setup (custom `users` table — no Auth)

## 1. Create project
https://supabase.com → New project

## 2. Run SQL
SQL Editor → paste **`supabase-schema.sql`** → Run

## 3. API keys
Project Settings → API  
Copy **Project URL** and **anon public** key into:

`assets/js/supabase-client.js`

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

## 4. Demo RLS
Schema includes open demo policies so the anon key can read/write.  
**For production:** delete demo policies and call Supabase only from a backend with `service_role`.

## 5. Page → table

| Page | Tables |
|------|--------|
| login / register | `users` |
| dashboard | `user_progress`, `interview_sessions` |
| upload-resume | `resumes` |
| resume-analysis | `resume_profiles` |
| job-description | `job_descriptions` |
| resume-job-match | `match_results` |
| preparation-plan | `preparation_plans` |
| interview-setup / ai-interview | `interview_sessions`, `interview_questions`, `interview_answers` |
| interview-report | `interview_reports` |
| progress | `user_progress` |

## 6. Frontend API
All helpers: `window.DB` in `assets/js/supabase-client.js`

```js
await DB.register({ fullName, email, password })
await DB.login({ email, password })
await DB.createResume({ fileName, fileType, rawText })
await DB.createJob({ title, company, rawText })
await DB.saveMatch({ resumeId, jobId, matchScore, ... })
await DB.createSession({ ... })
await DB.saveReport({ sessionId, overall, ... })
```

Passwords are SHA-256 hashed in the browser for demo only. Use bcrypt on a server in production.

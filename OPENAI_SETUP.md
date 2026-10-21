# AI setup (server-side key — nothing secret inside the app)

The app calls a Supabase **Edge Function** (`supabase/functions/ai-chat`) with the
signed-in user's token. The function checks the login, rate-limits
(20 requests/hour, 80/day per user — edit at the top of `index.ts`) and calls Groq
with a key that only exists as a server secret.

## Deploy (once)
```bash
npm i -g supabase                 # or use npx supabase
supabase login
supabase link --project-ref uajfitgssxwgbgaueeex     # your project ref
supabase secrets set GROQ_API_KEY=gsk_your_real_key   # free key: console.groq.com/keys
supabase functions deploy ai-chat
```
Optional secrets: `AI_MODEL` (default `llama-3.3-70b-versatile`),
`ALLOWED_ORIGIN` (e.g. `https://app.yourdomain.com`; default `*`).

`assets/js/config.js → aiProxyUrl` already points at
`https://<project>.supabase.co/functions/v1/ai-chat`. If you use another project, change it.

## Test
Sign in, start a mock interview → status should say questions were AI-generated.
If the function is down or the user is over limit the app silently falls back to the
built-in question banks (so the interview never breaks).

## Notes
* Users no longer need their own key. Settings has an optional **Advanced → own key**
  box (kept in that device's localStorage only) as a fallback.
* Never put a real key in `config.js` or anywhere in this repo.
* Watch your Groq usage; raise/lower limits in `index.ts` and redeploy.

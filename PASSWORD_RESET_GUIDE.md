# Setup guide — database, password reset, launch

## 1. Database (once)
Supabase → SQL Editor → run **supabase/schema.sql** (safe to re-run). It now also:
* adds Forgot password (email + new password) and old-account migration,
* deletes the empty 0% interview rows created by the old version.

## 2. Old accounts
Accounts created by the old login (only in `public.users`) sign in normally with their old password
(they are moved into Supabase Auth automatically) or use Forgot password.
When everyone has signed in once, remove the weak hashes:
`alter table public.users drop column if exists password_hash;`

## 3. Security note
Forgot password has no proof of identity: anyone who knows an email can set a new password for it
(5 resets per email per hour, all devices signed out). An emailed link would remove this risk.

## 4. Launch
`python3 scripts/configure.py --email ... --host ... --package ... --sha256 ...`
then `python3 scripts/prelaunch_check.py` (must show 0 FAIL), then follow PLAY_STORE_LAUNCH.md.

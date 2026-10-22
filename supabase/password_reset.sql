-- ============================================================
-- MockMaster — password fixes. Run once in Supabase SQL Editor.
--
-- 1) OLD ACCOUNTS: users created by the old custom login exist only in
--    public.users (with a SHA-256 password_hash) and not in Supabase Auth,
--    so login said "invalid" and reset said "no account".
--    -> migrate_legacy_login(): on a correct OLD password, creates the Auth
--       account (same id, so resumes/reports stay linked).
--    -> reset_password_by_email(): also creates the Auth account for old
--       users, so Forgot password works for them too.
-- 2) Forgot password = EMAIL + NEW PASSWORD only.
--    WARNING: no proof of identity — anyone who knows an email can change
--    that account's password. Limit: 5 resets per email per hour.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- clean up the earlier recovery-code experiment (safe if it never existed)
drop function if exists public.has_recovery_code();
drop function if exists public.generate_recovery_code();
drop function if exists public.reset_password_with_code(text, text, text);
drop table    if exists public.recovery_codes;

create table if not exists public.password_reset_log (
  id    bigserial primary key,
  email text not null,
  kind  text not null default 'reset',
  at    timestamptz not null default now()
);
alter table public.password_reset_log add column if not exists kind text not null default 'reset';
create index if not exists idx_pwreset_email_at on public.password_reset_log (email, kind, at);
alter table public.password_reset_log enable row level security;
revoke all on public.password_reset_log from anon, authenticated;

-- internal helper: create the Supabase Auth account for a legacy public.users row
create or replace function public._create_auth_user(p_id uuid, p_email text, p_password text, p_name text, p_phone text)
returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(p_name, ''), 'phone', coalesce(p_phone, ''), 'email_verified', true),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;
revoke all on function public._create_auth_user(uuid, text, text, text, text) from public, anon, authenticated;

-- Forgot password: email + new password
create or replace function public.reset_password_by_email(p_email text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  em  text := lower(trim(coalesce(p_email, '')));
  uid uuid;
  lu  public.users%rowtype;
begin
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid email address.');
  end if;
  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  end if;
  if octet_length(p_password) > 72 then
    return jsonb_build_object('ok', false, 'error', 'Password is too long (max 72 characters).');
  end if;

  delete from public.password_reset_log where at < now() - interval '1 day';
  if (select count(*) from public.password_reset_log
       where email = em and kind = 'reset' and at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again in an hour.');
  end if;
  insert into public.password_reset_log (email, kind) values (em, 'reset');

  select id into uid from auth.users where lower(email) = em limit 1;
  if uid is not null then
    update auth.users
       set encrypted_password = crypt(p_password, gen_salt('bf', 10)),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = uid;
    begin delete from auth.sessions where user_id = uid;
    exception when undefined_table then null; end;
    return jsonb_build_object('ok', true);
  end if;

  -- old account that only exists in public.users -> create its Auth account now
  select * into lu from public.users where lower(email) = em limit 1;
  if lu.id is null then
    return jsonb_build_object('ok', false, 'error', 'No account found with this email. Please register.');
  end if;
  if lu.is_active is false then
    return jsonb_build_object('ok', false, 'error', 'This account has been disabled.');
  end if;
  perform public._create_auth_user(lu.id, em, p_password, lu.full_name, lu.phone);
  return jsonb_build_object('ok', true);
end $$;

-- Login helper: old account + correct OLD password -> create its Auth account (then the app signs in)
create or replace function public.migrate_legacy_login(p_email text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
  lu public.users%rowtype;
  h  text;
begin
  if em = '' or p_password is null or p_password = '' or octet_length(p_password) > 72 then
    return jsonb_build_object('ok', false);
  end if;
  if exists (select 1 from auth.users where lower(email) = em) then
    return jsonb_build_object('ok', false);                 -- already a normal account
  end if;
  select * into lu from public.users where lower(email) = em limit 1;
  if lu.id is null or lu.is_active is false then
    return jsonb_build_object('ok', false);
  end if;

  if (select count(*) from public.password_reset_log
       where email = em and kind = 'migrate' and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false);
  end if;
  insert into public.password_reset_log (email, kind) values (em, 'migrate');

  begin
    execute 'select password_hash from public.users where id = $1' into h using lu.id;
  exception when undefined_column then h := null; end;
  if h is null or encode(digest(p_password, 'sha256'), 'hex') <> h then
    return jsonb_build_object('ok', false);
  end if;

  perform public._create_auth_user(lu.id, em, p_password, lu.full_name, lu.phone);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.reset_password_by_email(text, text) from public;
revoke all on function public.migrate_legacy_login(text, text)    from public;
grant execute on function public.reset_password_by_email(text, text) to anon, authenticated;
grant execute on function public.migrate_legacy_login(text, text)    to anon, authenticated;

-- ------------------------------------------------------------
-- LATER (after everyone has signed in once, or reset): remove the weak
-- unsalted SHA-256 hashes for good:
--    alter table public.users drop column if exists password_hash;
-- ------------------------------------------------------------
-- Check who is still "old" (exists in public.users but not in Auth):
--    select u.email from public.users u
--     where not exists (select 1 from auth.users a where a.id = u.id);

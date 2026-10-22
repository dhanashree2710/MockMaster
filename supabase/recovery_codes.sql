-- ============================================================
-- MockMaster — password recovery WITHOUT email (recovery code)
-- Run once in Supabase Dashboard -> SQL Editor.
--
-- Each signed-in user generates a one-time-visible recovery code
-- (Settings -> Recovery code). If they later forget the password,
-- email + recovery code lets them set a new one. Only a bcrypt hash
-- of the code is stored. Wrong codes are rate-limited per account.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.recovery_codes (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  code_hash       text not null,
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.recovery_codes enable row level security;
revoke all on public.recovery_codes from anon, authenticated;   -- only the functions below touch it

-- Does the signed-in user already have a code?
create or replace function public.has_recovery_code()
returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from public.recovery_codes where user_id = auth.uid());
$$;

-- Create (or replace) the signed-in user's code. Returned ONCE, never stored in plain text.
create or replace function public.generate_recovery_code()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  raw text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  raw := encode(gen_random_bytes(10), 'hex');            -- 80 bits of randomness
  insert into public.recovery_codes (user_id, code_hash)
  values (uid, crypt(raw, gen_salt('bf', 10)))
  on conflict (user_id) do update
    set code_hash = excluded.code_hash, failed_attempts = 0, locked_until = null, created_at = now();
  return upper(concat_ws('-', substr(raw,1,4), substr(raw,5,4), substr(raw,9,4), substr(raw,13,4), substr(raw,17,4)));
end $$;

-- Forgot password: email + recovery code + new password. Callable while signed out.
-- Failures RETURN a result (not raise) so the attempt counter is saved.
create or replace function public.reset_password_with_code(p_email text, p_code text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  uid uuid;
  rc  public.recovery_codes%rowtype;
  norm text;
  generic constant jsonb := jsonb_build_object('ok', false, 'error', 'Invalid email or recovery code.');
begin
  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  end if;
  if octet_length(p_password) > 72 then
    return jsonb_build_object('ok', false, 'error', 'Password is too long (max 72 characters).');
  end if;

  norm := lower(regexp_replace(coalesce(p_code, ''), '[^0-9a-fA-F]', '', 'g'));
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is not null then
    select * into rc from public.recovery_codes where user_id = uid for update;
  end if;

  if uid is null or rc.user_id is null then
    perform crypt(norm, gen_salt('bf', 10));              -- equalise timing; don't reveal if account exists
    return generic;
  end if;

  if rc.locked_until is not null and rc.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again in 15 minutes.');
  end if;

  if crypt(norm, rc.code_hash) = rc.code_hash then
    update auth.users
       set encrypted_password = crypt(p_password, gen_salt('bf', 10)),
           updated_at = now()
     where id = uid;
    begin delete from auth.sessions where user_id = uid;   -- sign out every device
    exception when undefined_table then null; end;
    delete from public.recovery_codes where user_id = uid; -- code is single-use
    return jsonb_build_object('ok', true);
  end if;

  update public.recovery_codes
     set locked_until    = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end,
         failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end
   where user_id = uid;
  return generic;
end $$;

revoke all on function public.has_recovery_code()                         from public;
revoke all on function public.generate_recovery_code()                    from public;
revoke all on function public.reset_password_with_code(text, text, text)  from public;
grant execute on function public.has_recovery_code()                        to authenticated;
grant execute on function public.generate_recovery_code()                   to authenticated;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;

-- ============================================================
-- ADMIN HELPERS (run manually in SQL Editor; NOT exposed to the app)
-- ============================================================
-- 1) Does this user exist in Auth? Confirmed? Banned?
--    select id, email, email_confirmed_at, banned_until, last_sign_in_at
--      from auth.users where lower(email) = lower('user@example.com');
-- 2) Confirm a user stuck on "Email not confirmed":
--    update auth.users set email_confirmed_at = now()
--      where lower(email) = lower('user@example.com') and email_confirmed_at is null;
-- 3) Set a new password for a user who has no recovery code:
--    update auth.users
--       set encrypted_password = extensions.crypt('TempPass#2026', extensions.gen_salt('bf', 10)), updated_at = now()
--     where lower(email) = lower('user@example.com');

-- ============================================================
-- MockMaster — Direct register/login via public.users
-- No Supabase Auth "Email" provider signup / no confirm email.
--
-- Run this in SQL Editor AFTER schema.sql (once).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Password column on users (direct auth)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;

-- Allow app-generated UUIDs (not only auth.users ids)
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop hard link to auth.users if present (optional; keeps legacy Auth rows working)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_fkey') THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_auth_fkey;
  END IF;
END $$;

-- Ensure progress row helper
CREATE OR REPLACE FUNCTION public.ensure_user_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
EXCEPTION WHEN others THEN
  BEGIN
    INSERT INTO public.user_progress (id, user_id)
    VALUES (gen_random_uuid(), p_user_id)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END;
$$;

-- ---------- REGISTER (public.users only) ----------
CREATE OR REPLACE FUNCTION public.register_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  em   text := lower(trim(coalesce(p_email, '')));
  nm   text := trim(coalesce(p_full_name, ''));
  ph   text := trim(coalesce(p_phone, ''));
  new_id uuid;
  hash text;
BEGIN
  IF em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter a valid email address.');
  END IF;
  IF nm = '' OR length(nm) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please enter your full name.');
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  END IF;
  IF octet_length(p_password) > 72 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Password is too long (max 72 characters).');
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = em) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'An account with this email already exists. Please sign in.');
  END IF;

  new_id := gen_random_uuid();
  hash := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO public.users (id, full_name, email, phone, password_hash, role, is_active, created_at, updated_at)
  VALUES (new_id, nm, em, NULLIF(ph, ''), hash, 'candidate', true, now(), now());

  PERFORM public.ensure_user_progress(new_id);

  -- Optional: mirror into auth.users so RLS (auth.uid()) still works for cloud saves.
  -- Does NOT use Auth Email provider or confirmation emails.
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
      IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_id) THEN
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', em,
          hash, now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', nm, 'phone', coalesce(ph, ''), 'email_verified', true),
          now(), now(),
          '', '', '', '', '', '', '', ''
        );
        INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES (
          gen_random_uuid(), new_id, new_id::text,
          jsonb_build_object('sub', new_id::text, 'email', em, 'email_verified', true),
          'email', now(), now(), now()
        );
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    -- public.users row is enough for app login; Auth mirror is best-effort
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'id', new_id,
    'email', em,
    'full_name', nm,
    'phone', ph,
    'role', 'candidate'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_user(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, text) TO anon, authenticated;

-- ---------- LOGIN (verify password on public.users) ----------
CREATE OR REPLACE FUNCTION public.login_user(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  em text := lower(trim(coalesce(p_email, '')));
  u  public.users%ROWTYPE;
BEGIN
  IF em = '' OR p_password IS NULL OR p_password = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email and password are required.');
  END IF;

  SELECT * INTO u FROM public.users WHERE lower(email) = em LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
  END IF;

  IF u.is_active IS FALSE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This account has been disabled.');
  END IF;

  IF u.password_hash IS NULL OR u.password_hash = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
  END IF;

  IF crypt(p_password, u.password_hash) <> u.password_hash THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
  END IF;

  UPDATE public.users SET last_login_at = now(), updated_at = now() WHERE id = u.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'phone', coalesce(u.phone, ''),
    'role', coalesce(u.role, 'candidate')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.login_user(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon, authenticated;

-- ---------- Optional: change password (logged-in user by id + old password) ----------
CREATE OR REPLACE FUNCTION public.change_password_users_table(
  p_user_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  u public.users%ROWTYPE;
  new_hash text;
BEGIN
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'New password must be at least 8 characters.');
  END IF;
  SELECT * INTO u FROM public.users WHERE id = p_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found.');
  END IF;
  IF u.password_hash IS NULL OR crypt(p_old_password, u.password_hash) <> u.password_hash THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Current password is incorrect.');
  END IF;
  new_hash := crypt(p_new_password, gen_salt('bf', 10));
  UPDATE public.users SET password_hash = new_hash, updated_at = now() WHERE id = u.id;
  BEGIN
    UPDATE auth.users SET encrypted_password = new_hash, updated_at = now() WHERE id = u.id;
  EXCEPTION WHEN others THEN NULL;
  END;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.change_password_users_table(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_password_users_table(uuid, text, text) TO anon, authenticated;

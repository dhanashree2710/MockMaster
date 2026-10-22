-- Paste into Supabase → SQL Editor → Run (entire script)
-- Fixes: register_user / login_user for public.users

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;

-- Remove old versions (any argument order)
DROP FUNCTION IF EXISTS public.register_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.register_user(text, text, text);
DROP FUNCTION IF EXISTS public.login_user(text, text);

-- Parameter names/order match what the app sends:
-- p_email, p_full_name, p_password, p_phone
CREATE OR REPLACE FUNCTION public.register_user(
  p_email text,
  p_full_name text,
  p_password text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, public
AS $$
DECLARE
  em     text := lower(trim(coalesce(p_email, '')));
  nm     text := trim(coalesce(p_full_name, ''));
  ph     text := trim(coalesce(p_phone, ''));
  digits text;
  new_id uuid;
  hash   text;
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

  IF ph <> '' THEN
    digits := regexp_replace(ph, '\D', '', 'g');
    IF length(digits) = 12 AND left(digits, 2) = '91' THEN
      digits := substring(digits from 3);
    END IF;
    IF length(digits) = 11 AND left(digits, 1) = '0' THEN
      digits := substring(digits from 2);
    END IF;
    IF length(digits) <> 10 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Phone number must be exactly 10 digits.');
    END IF;
    ph := digits;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = em) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'An account with this email already exists. Please sign in.');
  END IF;

  new_id := gen_random_uuid();
  hash := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO public.users (
    id, full_name, email, password_hash, phone, role, is_active, created_at, updated_at
  ) VALUES (
    new_id, nm, em, hash, NULLIF(ph, ''), 'candidate', true, now(), now()
  );

  BEGIN
    INSERT INTO public.user_progress (user_id) VALUES (new_id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
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

CREATE OR REPLACE FUNCTION public.login_user(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, public
AS $$
DECLARE
  em text := lower(trim(coalesce(p_email, '')));
  u  public.users%ROWTYPE;
BEGIN
  IF em = '' OR coalesce(p_password, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email and password are required.');
  END IF;

  SELECT * INTO u FROM public.users WHERE lower(email) = em LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
  END IF;

  IF coalesce(u.is_active, true) IS FALSE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This account has been disabled.');
  END IF;

  IF u.password_hash IS NULL OR crypt(p_password, u.password_hash) <> u.password_hash THEN
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

GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

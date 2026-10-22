-- ============================================================
-- MockMaster — Production schema v3 (Supabase Auth + strict RLS)
-- Run the WHOLE file once in Supabase -> SQL Editor.
-- Safe to re-run. Does not delete existing data.
--
-- BEFORE YOU RUN (only if you have old test users created with the
-- previous custom-password login): those rows cannot log in any more
-- because passwords now live in Supabase Auth. Either let those users
-- sign up again, or wipe test data first:
--     -- DELETE FROM public.users;   -- cascades to all user data
-- Also: Authentication -> Providers -> Email. For a smoother signup
-- you may turn OFF "Confirm email"; leaving it ON is more secure
-- (the app handles both).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,  -- = auth.users.id (Supabase Auth)
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  avatar_url text,
  phone text,
  preferred_lang text DEFAULT 'en'::text,
  role text DEFAULT 'candidate'::text CHECK (role = ANY (ARRAY['candidate'::text, 'admin'::text])),
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_type text CHECK (file_type = ANY (ARRAY['pdf'::text, 'doc'::text, 'docx'::text])),
  file_size_bytes integer,
  parse_status text DEFAULT 'pending'::text CHECK (parse_status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text])),
  raw_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resumes_pkey PRIMARY KEY (id),
  CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.resume_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  full_name text,
  email text,
  phone text,
  summary text,
  experience_json jsonb DEFAULT '[]'::jsonb,
  education_json jsonb DEFAULT '[]'::jsonb,
  skills_json jsonb DEFAULT '[]'::jsonb,
  projects_json jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  years_experience numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resume_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT resume_profiles_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE,
  CONSTRAINT resume_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.job_descriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  company text,
  raw_text text NOT NULL,
  parse_status text DEFAULT 'pending'::text CHECK (parse_status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text])),
  requirements_json jsonb DEFAULT '[]'::jsonb,
  skills_required jsonb DEFAULT '[]'::jsonb,
  responsibilities jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT job_descriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.match_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid NOT NULL,
  job_id uuid NOT NULL,
  match_score numeric,
  matched_skills jsonb DEFAULT '[]'::jsonb,
  missing_skills jsonb DEFAULT '[]'::jsonb,
  strengths_json jsonb DEFAULT '[]'::jsonb,
  gaps_json jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT match_results_pkey PRIMARY KEY (id),
  CONSTRAINT match_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT match_results_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE,
  CONSTRAINT match_results_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.preparation_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid,
  resume_id uuid,
  job_id uuid,
  title text DEFAULT 'My Preparation Plan'::text,
  focus_areas jsonb DEFAULT '[]'::jsonb,
  plan_items jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT preparation_plans_pkey PRIMARY KEY (id),
  CONSTRAINT preparation_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT preparation_plans_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.match_results(id) ON DELETE SET NULL,
  CONSTRAINT preparation_plans_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL,
  CONSTRAINT preparation_plans_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid,
  job_id uuid,
  match_id uuid,
  plan_id uuid,
  title text,
  mode text DEFAULT 'professional'::text CHECK (mode = ANY (ARRAY['friendly'::text, 'professional'::text, 'strict'::text])),
  difficulty text DEFAULT 'medium'::text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  language text DEFAULT 'en'::text,
  total_questions integer DEFAULT 10,
  status text DEFAULT 'setup'::text CHECK (status = ANY (ARRAY['setup'::text, 'in_progress'::text, 'completed'::text, 'abandoned'::text])),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interview_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT interview_sessions_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL,
  CONSTRAINT interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  CONSTRAINT interview_sessions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.match_results(id) ON DELETE SET NULL,
  CONSTRAINT interview_sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.preparation_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.interview_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  question_order integer NOT NULL,
  question_text text NOT NULL,
  category text,
  expected_focus text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interview_questions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_questions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.interview_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answer_text text,
  answer_audio_url text,
  duration_sec integer,
  score numeric,
  feedback text,
  metrics_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interview_answers_pkey PRIMARY KEY (id),
  CONSTRAINT interview_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  CONSTRAINT interview_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  CONSTRAINT interview_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.interview_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  overall_score numeric,
  clarity_score numeric,
  relevance_score numeric,
  depth_score numeric,
  delivery_score numeric,
  strengths_json jsonb DEFAULT '[]'::jsonb,
  improvements_json jsonb DEFAULT '[]'::jsonb,
  summary text,
  detailed_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interview_reports_pkey PRIMARY KEY (id),
  CONSTRAINT interview_reports_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  CONSTRAINT interview_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  interviews_done integer DEFAULT 0,
  avg_score numeric,
  best_score numeric,
  total_practice_min integer DEFAULT 0,
  skills_improved jsonb DEFAULT '[]'::jsonb,
  last_activity_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT app_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON public.resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.job_descriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.interview_sessions (user_id);

-- ------------------------------------------------------------
-- Migrations for databases created by older versions of this file
-- ------------------------------------------------------------
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- users.id must match auth.users.id (NOT VALID = don't check old rows)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_fkey') THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- users.id no longer auto-generated (comes from Auth)
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;

-- saveAnswer() upserts on (session_id, question_id): needs a unique index
DELETE FROM public.interview_answers a
USING public.interview_answers b
WHERE a.session_id = b.session_id AND a.question_id = b.question_id
  AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_session_question
  ON public.interview_answers (session_id, question_id);

-- ------------------------------------------------------------
-- New tables: AI-content reports (Play policy) + AI rate-limit log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,          -- 'ai_question' | 'ai_feedback' | 'ai_report' | 'other'
  content_ref text,                    -- session id / question text snippet
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_pkey PRIMARY KEY (id),
  CONSTRAINT content_reports_len CHECK (char_length(coalesce(details,'')) <= 2000)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time ON public.ai_usage_log (user_id, created_at DESC);

-- ============================================================
-- RLS: remove every old/open policy, then strict owner-only
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','resumes','resume_profiles','job_descriptions','match_results',
                        'preparation_plans','interview_sessions','interview_questions',
                        'interview_answers','interview_reports','user_progress','app_sessions',
                        'content_reports','ai_usage_log')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log        ENABLE ROW LEVEL SECURITY;

-- app_sessions was part of the old custom login; unused now.
-- (no policy => nobody except service_role can touch it)

-- ------------------------------------------------------------
-- Privileges: anon (not logged in) gets NOTHING.
-- ------------------------------------------------------------
REVOKE ALL ON public.users, public.resumes, public.resume_profiles, public.job_descriptions,
              public.match_results, public.preparation_plans, public.interview_sessions,
              public.interview_questions, public.interview_answers, public.interview_reports,
              public.user_progress, public.app_sessions, public.content_reports,
              public.ai_usage_log
  FROM anon, authenticated;

-- users: read own row; update ONLY harmless columns (role/email/is_active are locked)
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (full_name, avatar_url, phone, preferred_lang, last_login_at)
  ON public.users TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.resumes, public.resume_profiles, public.job_descriptions, public.match_results,
  public.preparation_plans, public.interview_sessions, public.interview_questions,
  public.interview_answers, public.interview_reports, public.user_progress
  TO authenticated;
GRANT SELECT, INSERT ON public.content_reports TO authenticated;

-- ------------------------------------------------------------
-- Policies (auth.uid() is now real: the app signs in via Supabase Auth)
-- ------------------------------------------------------------
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
-- No INSERT policy: rows are created by the trigger below.
-- No DELETE policy: account removal goes through delete_my_account().

CREATE POLICY resumes_own ON public.resumes FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY resume_profiles_own ON public.resume_profiles FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY jobs_own ON public.job_descriptions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY match_own ON public.match_results FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY plans_own ON public.preparation_plans FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY sessions_own ON public.interview_sessions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY answers_own ON public.interview_answers FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY reports_own ON public.interview_reports FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY progress_own ON public.user_progress FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY questions_via_session ON public.interview_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s
                 WHERE s.id = interview_questions.session_id AND s.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s
                 WHERE s.id = interview_questions.session_id AND s.user_id = (SELECT auth.uid())));

CREATE POLICY content_reports_insert_own ON public.content_reports
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY content_reports_select_own ON public.content_reports
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- Create the profile + starter progress row when someone signs up
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Legacy rows from the old custom login have no matching auth user and can never
  -- sign in. If one holds this email, remove it (cascades its old test data) so the
  -- UNIQUE(email) constraint cannot make sign-up fail. Real accounts are never touched.
  DELETE FROM public.users u
  WHERE lower(u.email) = lower(NEW.email)
    AND u.id <> NEW.id
    AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id);

  INSERT INTO public.users (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1)),
    lower(NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone','')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_progress (user_id, interviews_done, skills_improved)
  VALUES (NEW.id, 0, '[{"type":"credits","balance":100,"note":"new_user_bonus"}]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- Google Play: in-app account deletion
-- Deletes all of the caller's data (cascade) and their login.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.users WHERE id = uid;   -- cascades to every user table
  DELETE FROM auth.users   WHERE id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ============================================================
-- ============================================================
-- Password fixes + interview cleanup (part of schema.sql)
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

-- ------------------------------------------------------------
-- Cleanup: interviews whose upload was cut off (no report) showed up as 0% rows.
-- They contain no answers, so remove them. Real interviews have a report and are kept.
-- ------------------------------------------------------------
DELETE FROM public.interview_sessions s
WHERE s.status IN ('setup', 'in_progress')
  AND NOT EXISTS (SELECT 1 FROM public.interview_reports r WHERE r.session_id = s.id);

-- Old helper from the previous version (policies no longer use it)
DROP FUNCTION IF EXISTS public.current_app_user_id();

-- ------------------------------------------------------------
-- Verify: you should see NO policy that mentions role anon,
-- and NO policy named demo_* / *_for_login
-- ------------------------------------------------------------
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

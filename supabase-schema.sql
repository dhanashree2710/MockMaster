-- ============================================================
-- MOCKMASTER / Interview Pro AI — Supabase Schema
-- Uses custom "users" table (NO auth.users / Supabase Auth)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (replaces auth — used by login.html / register)
-- ============================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,              -- store bcrypt/argon2 hash from backend
  avatar_url      TEXT,
  phone           TEXT,
  preferred_lang  TEXT DEFAULT 'en',
  role            TEXT DEFAULT 'candidate' CHECK (role IN ('candidate', 'admin')),
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users (email);

-- ============================================================
-- 2. RESUMES (upload-resume.html → resume-analysis.html)
-- ============================================================
CREATE TABLE public.resumes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT,                       -- storage path / public URL
  file_type       TEXT CHECK (file_type IN ('pdf', 'doc', 'docx')),
  file_size_bytes INTEGER,
  parse_status    TEXT DEFAULT 'pending'
                    CHECK (parse_status IN ('pending', 'processing', 'done', 'failed')),
  raw_text        TEXT,                       -- extracted text from PDF/DOC
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resumes_user ON public.resumes (user_id);

-- ============================================================
-- 3. RESUME_PROFILES (AI structuring → structured resume data)
-- ============================================================
CREATE TABLE public.resume_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id       UUID NOT NULL UNIQUE REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,
  summary         TEXT,
  experience_json JSONB DEFAULT '[]'::jsonb,  -- [{title, company, years, bullets[]}]
  education_json  JSONB DEFAULT '[]'::jsonb,
  skills_json     JSONB DEFAULT '[]'::jsonb,  -- ["React","Node",...]
  projects_json   JSONB DEFAULT '[]'::jsonb,
  certifications  JSONB DEFAULT '[]'::jsonb,
  years_experience NUMERIC(4,1),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_profiles_user ON public.resume_profiles (user_id);

-- ============================================================
-- 4. JOB_DESCRIPTIONS (job-description.html)
-- ============================================================
CREATE TABLE public.job_descriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT,
  company         TEXT,
  raw_text        TEXT NOT NULL,              -- pasted JD text
  parse_status    TEXT DEFAULT 'pending'
                    CHECK (parse_status IN ('pending', 'processing', 'done', 'failed')),
  requirements_json JSONB DEFAULT '[]'::jsonb,
  skills_required   JSONB DEFAULT '[]'::jsonb,
  responsibilities  JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_descriptions_user ON public.job_descriptions (user_id);

-- ============================================================
-- 5. MATCH_RESULTS (resume-job-match.html — skills & gaps)
-- ============================================================
CREATE TABLE public.match_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_id       UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  match_score     NUMERIC(5,2),               -- 0–100
  matched_skills  JSONB DEFAULT '[]'::jsonb,
  missing_skills  JSONB DEFAULT '[]'::jsonb,  -- gaps
  strengths_json  JSONB DEFAULT '[]'::jsonb,
  gaps_json       JSONB DEFAULT '[]'::jsonb,
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_results_user ON public.match_results (user_id);
CREATE UNIQUE INDEX idx_match_unique ON public.match_results (resume_id, job_id);

-- ============================================================
-- 6. PREPARATION_PLANS (preparation-plan.html)
-- ============================================================
CREATE TABLE public.preparation_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id        UUID REFERENCES public.match_results(id) ON DELETE SET NULL,
  resume_id       UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  title           TEXT DEFAULT 'My Preparation Plan',
  focus_areas     JSONB DEFAULT '[]'::jsonb,  -- skills/topics to practice
  plan_items      JSONB DEFAULT '[]'::jsonb,  -- [{topic, priority, notes}]
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'archived')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prep_plans_user ON public.preparation_plans (user_id);

-- ============================================================
-- 7. INTERVIEW_SESSIONS (interview-setup.html → ai-interview.html)
-- ============================================================
CREATE TABLE public.interview_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_id       UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  match_id        UUID REFERENCES public.match_results(id) ON DELETE SET NULL,
  plan_id         UUID REFERENCES public.preparation_plans(id) ON DELETE SET NULL,
  title           TEXT,
  mode            TEXT DEFAULT 'professional'
                    CHECK (mode IN ('friendly', 'professional', 'strict')),
  difficulty      TEXT DEFAULT 'medium'
                    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  language        TEXT DEFAULT 'en',
  total_questions INTEGER DEFAULT 10,
  status          TEXT DEFAULT 'setup'
                    CHECK (status IN ('setup', 'in_progress', 'completed', 'abandoned')),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interview_sessions_user ON public.interview_sessions (user_id);
CREATE INDEX idx_interview_sessions_status ON public.interview_sessions (status);

-- ============================================================
-- 8. INTERVIEW_QUESTIONS (generated for a session)
-- ============================================================
CREATE TABLE public.interview_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_order  INTEGER NOT NULL,
  question_text   TEXT NOT NULL,
  category        TEXT,                       -- behavioral, technical, situational
  expected_focus  TEXT,                       -- skill/topic this targets
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, question_order)
);

CREATE INDEX idx_interview_questions_session ON public.interview_questions (session_id);

-- ============================================================
-- 9. INTERVIEW_ANSWERS (Q&A during ai-interview.html)
-- ============================================================
CREATE TABLE public.interview_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answer_text     TEXT,
  answer_audio_url TEXT,                      -- optional voice answer
  duration_sec    INTEGER,
  score           NUMERIC(5,2),               -- per-answer score 0–100
  feedback        TEXT,                       -- short AI feedback
  metrics_json    JSONB DEFAULT '{}'::jsonb,  -- {clarity, relevance, depth, delivery}
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX idx_interview_answers_session ON public.interview_answers (session_id);
CREATE INDEX idx_interview_answers_user ON public.interview_answers (user_id);

-- ============================================================
-- 10. INTERVIEW_REPORTS (interview-report.html — final AI report)
-- ============================================================
CREATE TABLE public.interview_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  overall_score   NUMERIC(5,2),
  clarity_score   NUMERIC(5,2),
  relevance_score NUMERIC(5,2),
  depth_score     NUMERIC(5,2),
  delivery_score  NUMERIC(5,2),
  strengths_json  JSONB DEFAULT '[]'::jsonb,
  improvements_json JSONB DEFAULT '[]'::jsonb,
  summary         TEXT,
  detailed_json   JSONB DEFAULT '{}'::jsonb,  -- full structured report
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interview_reports_user ON public.interview_reports (user_id);

-- ============================================================
-- 11. USER_PROGRESS (progress.html / dashboard aggregates)
-- ============================================================
CREATE TABLE public.user_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  interviews_done INTEGER DEFAULT 0,
  avg_score       NUMERIC(5,2),
  best_score      NUMERIC(5,2),
  total_practice_min INTEGER DEFAULT 0,
  skills_improved JSONB DEFAULT '[]'::jsonb,
  last_activity_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. SESSIONS (optional app session tokens — NOT Supabase Auth)
--     Use if you issue your own JWT/session after login
-- ============================================================
CREATE TABLE public.app_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_sessions_user ON public.app_sessions (user_id);
CREATE INDEX idx_app_sessions_expires ON public.app_sessions (expires_at);

-- ============================================================
-- UPDATED_AT trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resumes_updated
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resume_profiles_updated
  BEFORE UPDATE ON public.resume_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_job_descriptions_updated
  BEFORE UPDATE ON public.job_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_prep_plans_updated
  BEFORE UPDATE ON public.preparation_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_interview_sessions_updated
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_progress_updated
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- PAGE → TABLE MAP (for frontend / API)
-- ============================================================
-- pages/login.html, register.html     → users, app_sessions
-- pages/dashboard.html                → users, user_progress, interview_sessions
-- pages/resume/upload-resume.html     → resumes
-- pages/resume/resume-analysis.html   → resumes, resume_profiles
-- pages/job/job-description.html      → job_descriptions
-- pages/job/resume-job-match.html     → match_results (+ resumes, job_descriptions)
-- pages/preparation/preparation-plan  → preparation_plans
-- pages/interview/interview-setup     → interview_sessions
-- pages/interview/ai-interview.html   → interview_questions, interview_answers
-- pages/interview/interview-history   → interview_sessions
-- pages/report/interview-report.html  → interview_reports
-- pages/profile.html                  → users
-- pages/progress.html                 → user_progress
-- pages/settings.html                 → users (prefs)

-- ============================================================
-- USEFUL QUERIES
-- ============================================================

-- Register user (backend hashes password first)
-- INSERT INTO public.users (full_name, email, password_hash)
-- VALUES ('Alex Rivera', 'alex@company.com', '$2b$...');

-- Login lookup
-- SELECT id, full_name, email, password_hash, is_active
-- FROM public.users WHERE email = $1 AND is_active = TRUE;

-- Dashboard: recent sessions + progress
-- SELECT s.*, r.overall_score
-- FROM public.interview_sessions s
-- LEFT JOIN public.interview_reports r ON r.session_id = s.id
-- WHERE s.user_id = $1
-- ORDER BY s.created_at DESC
-- LIMIT 10;

-- Full report for a session
-- SELECT s.*, q.question_order, q.question_text, a.answer_text, a.score, a.feedback,
--        rep.overall_score, rep.summary, rep.strengths_json, rep.improvements_json
-- FROM public.interview_sessions s
-- JOIN public.interview_questions q ON q.session_id = s.id
-- LEFT JOIN public.interview_answers a ON a.question_id = q.id
-- LEFT JOIN public.interview_reports rep ON rep.session_id = s.id
-- WHERE s.id = $1 AND s.user_id = $2
-- ORDER BY q.question_order;

-- Match resume ↔ job
-- SELECT m.*, rp.skills_json, jd.skills_required
-- FROM public.match_results m
-- JOIN public.resume_profiles rp ON rp.resume_id = m.resume_id
-- JOIN public.job_descriptions jd ON jd.id = m.job_id
-- WHERE m.user_id = $1
-- ORDER BY m.created_at DESC;

-- ============================================================
-- RLS (optional — only if you later add Supabase client keys)
-- With custom users table, prefer API backend + service role.
-- Example: disable open access by default.
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- No policies = no direct anon access. Use service_role from your backend.

-- DEMO policies (anon key) — remove in production
CREATE POLICY "demo_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_resumes" ON public.resumes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_resume_profiles" ON public.resume_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_jobs" ON public.job_descriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_match" ON public.match_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_plans" ON public.preparation_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_sessions" ON public.interview_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_questions" ON public.interview_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_answers" ON public.interview_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_reports" ON public.interview_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_progress" ON public.user_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "demo_all_app_sessions" ON public.app_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_session_question ON public.interview_answers (session_id, question_id);

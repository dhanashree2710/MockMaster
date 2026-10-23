/**
 * MOCKMASTER — Supabase client (Supabase Auth + strict RLS)
 *
 * Auth is handled by Supabase Auth (email + password). Passwords never touch
 * our tables. Run supabase/schema.sql once. The anon key below is PUBLIC by
 * design — it is only safe because RLS (see schema.sql) restricts every table
 * to the logged-in owner.
 */

const SUPABASE_URL = 'https://uajfitgssxwgbgaueeex.supabase.co';           // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhamZpdGdzc3h3Z2JnYXVlZWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MTg0MjcsImV4cCI6MjEwMzM5NDQyN30.BpZuSlUOkP7qvkAJjOLc-KjRboolzHI7twPg1hvJz5o';

let _client = null;
let _loadPromise = null;

/** Candidate paths for local vendor copy (works from /pages and /pages/*) */
function supabaseScriptCandidates() {
  var base = '';
  try {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (/supabase-client\.js/i.test(src)) {
        base = src.replace(/assets\/js\/supabase-client\.js.*$/i, '');
        break;
      }
    }
  } catch (_) {}
  var list = [];
  if (base) list.push(base + 'vendor/supabase/supabase.js');
  list.push('../vendor/supabase/supabase.js');
  list.push('../../vendor/supabase/supabase.js');
  list.push('/vendor/supabase/supabase.js');
  list.push('./vendor/supabase/supabase.js');
  // unique
  return list.filter(function (u, i, a) { return u && a.indexOf(u) === i; });
}

function ensureSupabaseJs() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    return Promise.resolve(true);
  }
  if (_loadPromise) return _loadPromise;
  _loadPromise = new Promise(function (resolve) {
    var paths = supabaseScriptCandidates();
    var idx = 0;
    function tryNext() {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        resolve(true);
        return;
      }
      if (idx >= paths.length) {
        console.warn('Supabase JS not loaded. Tried:', paths.join(', '));
        resolve(false);
        return;
      }
      var url = paths[idx++];
      var s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = function () {
        if (window.supabase && typeof window.supabase.createClient === 'function') resolve(true);
        else tryNext();
      };
      s.onerror = function () { tryNext(); };
      document.head.appendChild(s);
    }
    tryNext();
  });
  return _loadPromise;
}

// Kick off load early (non-blocking) so auth pages get it quickly
if (typeof document !== 'undefined') {
  try { ensureSupabaseJs(); } catch (_) {}
}

function getSupabase() {
  if (_client) return _client;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    // Attempt sync path already present; async loader runs in background
    console.warn('Supabase JS not loaded yet. ensureSupabaseJs() will retry.');
    try { ensureSupabaseJs(); } catch (_) {}
    return null;
  }
  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) {
    console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-client.js');
    return null;
  }
  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return _client;
}

/** Awaitable client — use in login/register when script may still be loading */
async function getSupabaseAsync() {
  if (_client) return _client;
  await ensureSupabaseJs();
  return getSupabase();
}
window.getSupabaseAsync = getSupabaseAsync;
window.ensureSupabaseJs = ensureSupabaseJs;

const SESSION_KEY = 'mm_session';
// Per-user data cached on the device. Wiped on logout / delete so the next
// person on a shared phone never sees it. (Theme, language and AI keys stay.)
const LOCAL_USER_KEYS = [
  'ipa_user', 'ipa_resume', 'ipa_job', 'ipa_match', 'ipa_sessions', 'ipa_progress',
  'mm_credits', 'mm_credits_history', 'mm_redeemed', 'mm_user_progress'
];

const DB = {
  isConfigured() {
    return !!(getSupabase());
  },
  /** Wait until vendor supabase.js is available (or fail) */
  async ready(timeoutMs) {
    const ms = timeoutMs == null ? 8000 : timeoutMs;
    const start = Date.now();
    while (Date.now() - start < ms) {
      const c = getSupabase();
      if (c) return c;
      await ensureSupabaseJs();
      if (getSupabase()) return getSupabase();
      await new Promise(r => setTimeout(r, 120));
    }
    return getSupabase();
  },

  // ---------- Session (local, not Supabase Auth) ----------
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch { return null; }
  },
  setSession(user) {
    if (!user || !user.id || user.id === 'demo') throw new Error('Invalid session user');
    const payload = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role || 'candidate',
      loggedInAt: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    // backward compat with existing auth-guard
    localStorage.setItem('ipa_user', JSON.stringify({
      id: user.id,
      name: user.full_name,
      email: user.email,
      loggedIn: true
    }));
    return payload;
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    LOCAL_USER_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
  },
  async signOut() {
    try { const sb = getSupabase(); if (sb) await sb.auth.signOut(); } catch (_) {}
    this.clearSession();
  },
  /** true if a real Supabase session exists (token valid / refreshable) */
  async verifySession() {
    try {
      const local = this.getSession();
      if (local && local.userId && local.userId !== 'demo') return true;
    } catch (_) {}
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { data } = await sb.auth.getSession();
      return !!(data && data.session);
    } catch (_) { return false; }
  },
  async getAccessToken() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  },
  requireUser() {
    const s = this.getSession();
    if (!s?.userId || s.userId === 'demo') throw new Error('Not logged in');
    return s;
  },


  /** Call RPC via supabase-js, then raw REST if schema-cache misses the function */
  async _rpc(name, args) {
    const sb = getSupabase();
    if (!sb) throw new Error('Service unavailable. Please try again later.');
    try {
      const res = await sb.rpc(name, args);
      if (res.error) {
        const m = String(res.error.message || '');
        if (/schema cache|could not find the function/i.test(m)) {
          // fall through to REST
        } else {
          return res;
        }
      } else {
        return res;
      }
    } catch (e) {
      const m = String((e && e.message) || e || '');
      if (!/schema cache|could not find the function/i.test(m)) throw e;
    }
    // Direct PostgREST call (same project URL + anon key)
    const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + encodeURIComponent(name);
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify(args)
    });
    const textBody = await r.text();
    let data = null;
    try { data = textBody ? JSON.parse(textBody) : null; } catch (_) { data = textBody; }
    if (!r.ok) {
      const msg = (data && (data.message || data.error || data.hint)) || textBody || ('RPC failed ' + r.status);
      return { data: null, error: { message: msg } };
    }
    return { data, error: null };
  },

  // ---------- Users: direct public.users register/login (no Auth Email provider) ----------
  async register({ fullName, email, password, phone }) {
    const sb = getSupabase();
    if (!sb) throw new Error('Service unavailable. Please try again later.');
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await this._rpc('mm_register', {
      payload: {
        email: cleanEmail,
        full_name: (fullName || '').trim(),
        password: password,
        phone: (phone && String(phone).trim()) || null
      }
    });
    if (error) {
      const m = String(error.message || '');
      if (/already|registered|duplicate|unique/i.test(m)) {
        throw new Error('An account with this email already exists. Please sign in.');
      }
      if (/function.*(register_user|mm_register).*does not exist|schema cache/i.test(m)) {
        throw new Error('Database not ready: run supabase/schema.sql in the Supabase SQL Editor, then wait a few seconds and retry.');
      }
      throw new Error(error.message || 'Sign up failed');
    }
    const row = data && typeof data === 'object' ? data : null;
    if (!row || row.ok === false) {
      throw new Error((row && row.error) || 'Sign up failed');
    }
    const user = {
      id: row.id,
      full_name: row.full_name || (fullName || '').trim(),
      email: row.email || cleanEmail,
      role: row.role || 'candidate'
    };
    this.setSession(user);
    // Optional JWT for RLS if auth.users was mirrored by the RPC
    try { await sb.auth.signInWithPassword({ email: cleanEmail, password }); } catch (_) {}
    try {
      if (window.Utils && Utils.setCredits) {
        Utils.setCredits(100);
        const hist = Utils.getStored('mm_credits_history', []);
        hist.unshift({ amount: 100, reason: 'Welcome bonus — new user', at: new Date().toISOString(), balance: 100 });
        Utils.setStored('mm_credits_history', hist.slice(0, 100));
      } else {
        localStorage.setItem('mm_credits', '100');
      }
    } catch (_) {}
    return { ...user, needsConfirmation: false };
  },

  async login({ email, password }) {
    const sb = getSupabase();
    if (!sb) throw new Error('Service unavailable. Please try again later.');
    const em = email.trim().toLowerCase();

    // Primary: public.users via login_user RPC
    let row = null;
    try {
      const res = await this._rpc('mm_login', { payload: { email: em, password: password } });
      if (res.error) {
        const m = String(res.error.message || '');
        if (/function.*login_user.*does not exist/i.test(m)) {
          // fall through to Auth below
        } else {
          throw new Error(res.error.message || 'Sign in failed');
        }
      } else {
        row = res.data && typeof res.data === 'object' ? res.data : null;
        if (row && row.ok === false) {
          throw new Error(row.error || 'Invalid email or password.');
        }
      }
    } catch (e) {
      if (e && e.message && !/function.*does not exist/i.test(e.message)) throw e;
    }

    if (row && row.ok) {
      const user = {
        id: row.id,
        full_name: row.full_name || em.split('@')[0],
        email: row.email || em,
        role: row.role || 'candidate'
      };
      this.setSession(user);
      try { await sb.auth.signInWithPassword({ email: em, password }); } catch (_) {}
      try { await this.hydrateLocalFromCloud(); } catch (e) { console.warn('hydrate', e); }
      return user;
    }

    // Fallback: Supabase Auth (legacy accounts)
    let { data, error } = await sb.auth.signInWithPassword({ email: em, password });
    if (error && /invalid login credentials/i.test(String(error.message || ''))) {
      try {
        const mig = await sb.rpc('migrate_legacy_login', { p_email: em, p_password: password });
        if (mig && mig.data && mig.data.ok) {
          ({ data, error } = await sb.auth.signInWithPassword({ email: em, password }));
        }
      } catch (_) {}
    }
    if (error) {
      const m = String(error.message || '');
      if (/not confirmed/i.test(m)) throw new Error('Account not ready yet. Wait a few seconds and try signing in again.');
      if (/invalid login credentials/i.test(m)) throw new Error('Invalid email or password. Forgot it? Use “Forgot password?”.');
      if (/rate limit|too many|over_request/i.test(m) || error.status === 429) throw new Error('Too many attempts. Wait a few minutes and try again.');
      if (/banned|disabled/i.test(m)) throw new Error('This account has been disabled.');
      if (/fetch|network|failed to/i.test(m) || error.status === 0) throw new Error('Network problem. Check your connection and try again.');
      console.warn('login error', error);
      throw new Error(m || 'Sign in failed');
    }
    const au = data.user;
    let prof = null;
    try {
      const r = await sb.from('users')
        .select('id, full_name, email, role, is_active')
        .eq('id', au.id).maybeSingle();
      prof = r.data;
    } catch (_) {}
    if (prof && prof.is_active === false) {
      try { await sb.auth.signOut(); } catch (_) {}
      throw new Error('This account has been disabled.');
    }
    const user = {
      id: au.id,
      full_name: (prof && prof.full_name) || (au.user_metadata && au.user_metadata.full_name) || au.email.split('@')[0],
      email: au.email,
      role: (prof && prof.role) || 'candidate'
    };
    this.setSession(user);
    try { await sb.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', au.id); } catch (_) {}
    try { await this.hydrateLocalFromCloud(); } catch (e) { console.warn('hydrate', e); }
    return user;
  },

  /** Forgot password: email + new password only (see supabase/schema.sql) */
  async resetPasswordByEmail({ email, password }) {
    if (this.ready) await this.ready(8000);
    const sb = getSupabase();
    if (!sb) throw new Error('Service unavailable. Please try again later.');
    const em = String(email || '').trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Enter a valid email address');
    if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
    const { data, error } = await sb.rpc('reset_password_by_email', { p_email: em, p_password: String(password) });
    if (error) {
      if (/does not exist|schema cache/i.test(error.message || '')) {
        throw new Error('Password reset is not set up yet. Run supabase/schema.sql in Supabase SQL Editor.');
      }
      throw new Error(error.message || 'Could not reset password');
    }
    if (!data || !data.ok) throw new Error((data && data.error) || 'Could not reset password');
    return true;
  },

  async updatePassword(newPassword) {
    if (this.ready) await this.ready(8000);
    const sb = getSupabase();
    if (!sb) throw new Error('Service unavailable. Please try again later.');
    const pw = String(newPassword || '');
    if (pw.length < 8) throw new Error('Password must be at least 8 characters');
    // Ensure we have a session (recovery link or logged-in user)
    const { data: sess } = await sb.auth.getSession();
    if (!sess || !sess.session) {
      throw new Error('Your session has expired. Sign in again, then retry.');
    }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw new Error(error.message || 'Could not update password');
    return true;
  },

  /** Google Play requirement: permanently delete account + all data */
  async deleteAccount() {
    const sb = getSupabase();
    if (!sb) throw new Error('Service unavailable');
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw new Error(error.message || 'Could not delete account');
    try { await sb.auth.signOut(); } catch (_) {}
    this.clearSession();
    return true;
  },

  /** Report AI-generated content (Google Play AI-content policy) */
  async reportContent({ type, ref, reason, details }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { error } = await sb.from('content_reports').insert({
      user_id: s.userId,
      content_type: type || 'other',
      content_ref: ref ? String(ref).slice(0, 500) : null,
      reason: String(reason || 'Other').slice(0, 200),
      details: details ? String(details).slice(0, 2000) : null
    });
    if (error) throw new Error(error.message || 'Could not send report');
    return true;
  },

  async getProfile(userId) {
    const sb = getSupabase();
    const { data, error } = await sb.from('users')
      .select('id, full_name, email, avatar_url, phone, preferred_lang, role, created_at')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, patch) {
    const sb = getSupabase();
    const { data, error } = await sb.from('users')
      .update(patch)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ---------- Resumes ----------
  async createResume({ fileName, fileUrl, fileType, fileSizeBytes, rawText }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('resumes').insert({
      user_id: s.userId,
      file_name: fileName,
      file_url: fileUrl || null,
      file_type: fileType || null,
      file_size_bytes: fileSizeBytes || null,
      raw_text: rawText || null,
      parse_status: 'pending'
    }).select().single();
    if (error) throw error;
    return data;
  },

  async listResumes() {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('resumes')
      .select('*')
      .eq('user_id', s.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async saveResumeProfile(resumeId, profile) {
    const s = this.requireUser();
    const sb = getSupabase();
    const row = {
      resume_id: resumeId,
      user_id: s.userId,
      full_name: profile.full_name || null,
      email: profile.email || null,
      phone: profile.phone || null,
      summary: profile.summary || null,
      experience_json: profile.experience_json || [],
      education_json: profile.education_json || [],
      skills_json: profile.skills_json || [],
      projects_json: profile.projects_json || [],
      certifications: profile.certifications || [],
      years_experience: profile.years_experience || null
    };
    const { data, error } = await sb.from('resume_profiles')
      .upsert(row, { onConflict: 'resume_id' })
      .select()
      .single();
    if (error) throw error;
    await sb.from('resumes').update({ parse_status: 'done' }).eq('id', resumeId);
    return data;
  },

  // ---------- Job descriptions ----------
  async createJob({ title, company, rawText }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('job_descriptions').insert({
      user_id: s.userId,
      title: title || null,
      company: company || null,
      raw_text: rawText,
      parse_status: 'pending'
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateJobParsed(jobId, parsed) {
    const sb = getSupabase();
    const { data, error } = await sb.from('job_descriptions').update({
      title: parsed.title,
      company: parsed.company,
      requirements_json: parsed.requirements_json || [],
      skills_required: parsed.skills_required || [],
      responsibilities: parsed.responsibilities || [],
      parse_status: 'done'
    }).eq('id', jobId).select().single();
    if (error) throw error;
    return data;
  },

  // ---------- Match ----------
  async saveMatch({ resumeId, jobId, matchScore, matchedSkills, missingSkills, strengths, gaps, aiSummary }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('match_results').insert({
      user_id: s.userId,
      resume_id: resumeId,
      job_id: jobId,
      match_score: matchScore,
      matched_skills: matchedSkills || [],
      missing_skills: missingSkills || [],
      strengths_json: strengths || [],
      gaps_json: gaps || [],
      ai_summary: aiSummary || null
    }).select().single();
    if (error) throw error;
    return data;
  },

  // ---------- Preparation plans ----------
  async createPlan({ matchId, resumeId, jobId, title, focusAreas, planItems }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('preparation_plans').insert({
      user_id: s.userId,
      match_id: matchId || null,
      resume_id: resumeId || null,
      job_id: jobId || null,
      title: title || 'My Preparation Plan',
      focus_areas: focusAreas || [],
      plan_items: planItems || [],
      status: 'active'
    }).select().single();
    if (error) throw error;
    return data;
  },

  // ---------- Interview sessions ----------
  async createSession({ resumeId, jobId, matchId, planId, title, mode, difficulty, language, totalQuestions }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_sessions').insert({
      user_id: s.userId,
      resume_id: resumeId || null,
      job_id: jobId || null,
      match_id: matchId || null,
      plan_id: planId || null,
      title: title || 'AI Mock Interview',
      mode: mode || 'professional',
      difficulty: difficulty || 'medium',
      language: language || 'en',
      total_questions: totalQuestions || 10,
      status: 'setup'
    }).select().single();
    if (error) throw error;
    return data;
  },

  async startSession(sessionId) {
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_sessions').update({
      status: 'in_progress',
      started_at: new Date().toISOString()
    }).eq('id', sessionId).select().single();
    if (error) throw error;
    return data;
  },

  async completeSession(sessionId) {
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', sessionId).select().single();
    if (error) throw error;
    return data;
  },

  async listSessions() {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_sessions')
      .select('*, interview_reports(overall_score)')
      .eq('user_id', s.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addQuestions(sessionId, questions) {
    const sb = getSupabase();
    const rows = questions.map((q, i) => ({
      session_id: sessionId,
      question_order: i + 1,
      question_text: q.question_text || q.text,
      category: q.category || null,
      expected_focus: q.expected_focus || null
    }));
    const { data, error } = await sb.from('interview_questions').insert(rows).select();
    if (error) throw error;
    return data;
  },

  async saveAnswer({ sessionId, questionId, answerText, score, feedback, metrics, durationSec }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_answers').upsert({
      session_id: sessionId,
      question_id: questionId,
      user_id: s.userId,
      answer_text: answerText,
      score: score ?? null,
      feedback: feedback || null,
      metrics_json: metrics || {},
      duration_sec: durationSec || null
    }, { onConflict: 'session_id,question_id' }).select().single();
    if (error) throw error;
    return data;
  },

  async saveReport({ sessionId, overall, clarity, relevance, depth, delivery, strengths, improvements, summary, detailed }) {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_reports').upsert({
      session_id: sessionId,
      user_id: s.userId,
      overall_score: overall,
      clarity_score: clarity,
      relevance_score: relevance,
      depth_score: depth,
      delivery_score: delivery,
      strengths_json: strengths || [],
      improvements_json: improvements || [],
      summary: summary || null,
      detailed_json: detailed || {}
    }, { onConflict: 'session_id' }).select().single();
    if (error) throw error;
    // bump progress
    await this.refreshProgress();
    return data;
  },

  async getReport(sessionId) {
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_reports')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async refreshProgress() {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data: reports } = await sb.from('interview_reports')
      .select('overall_score')
      .eq('user_id', s.userId);
    const scores = (reports || []).map(r => Number(r.overall_score)).filter(n => !isNaN(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const best = scores.length ? Math.max(...scores) : null;
    await sb.from('user_progress').upsert({
      user_id: s.userId,
      interviews_done: scores.length,
      avg_score: avg,
      best_score: best,
      last_activity_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  },


  /** Normalise UI labels to the values the database CHECK constraints accept */
  _normDifficulty(d) {
    const t = String(d || 'medium').toLowerCase();
    if (/easy|beginner|basic|fresher|junior/.test(t)) return 'easy';
    if (/hard|advanced|expert|senior/.test(t)) return 'hard';
    return 'medium';
  },
  _normMode(m) {
    const t = String(m || 'professional').toLowerCase();
    if (t.includes('friend')) return 'friendly';
    if (t.includes('strict')) return 'strict';
    return 'professional';
  },

  /**
   * Save a finished interview (session + questions + answers + report) in one go.
   * `cid` makes it safe to retry: the same interview is never stored twice.
   */
  async saveInterviewResult(p) {
    const s = this.requireUser();
    const sb = getSupabase();
    const setup = p.setup || {};
    const answers = p.answers || [];
    if (!answers.length) return null;

    if (p.cid) {
      const { data: dup } = await sb.from('interview_reports').select('id')
        .eq('user_id', s.userId).eq('detailed_json->>cid', String(p.cid)).limit(1);
      if (dup && dup.length) return { duplicate: true };
    }

    const startedAt = new Date(new Date(p.completedAt || Date.now()).getTime() - (Number(p.duration) || 0) * 1000).toISOString();
    const { data: sess, error: e1 } = await sb.from('interview_sessions').insert({
      user_id: s.userId,
      resume_id: p.resumeId || null,
      job_id: p.jobId || null,
      title: setup.position || 'Mock Interview',
      mode: this._normMode(setup.style),
      difficulty: this._normDifficulty(setup.difficulty),
      language: setup.language || 'en',
      total_questions: setup.numQuestions || answers.length,
      status: 'in_progress',
      started_at: startedAt
    }).select().single();
    if (e1) throw e1;

    // Questions + answers (failures here must never block the report)
    try {
      const { data: qs, error: e2 } = await sb.from('interview_questions').insert(
        answers.map((a, i) => ({ session_id: sess.id, question_order: i + 1, question_text: a.question, category: a.type || 'general' }))
      ).select();
      if (e2) throw e2;
      const byOrder = {};
      (qs || []).forEach(q => { byOrder[q.question_order] = q.id; });
      const rows = answers.map((a, i) => byOrder[i + 1] ? {
        session_id: sess.id, question_id: byOrder[i + 1], user_id: s.userId,
        answer_text: a.answer, score: a.score ?? null, feedback: a.evaluation || null, metrics_json: {}
      } : null).filter(Boolean);
      if (rows.length) {
        const { error: e3 } = await sb.from('interview_answers').insert(rows);
        if (e3) console.warn('answers save', e3);
      }
    } catch (err) { console.warn('questions/answers save', err); }

    const overall = Number(p.overallScore) || 0;
    const avg = key => {
      const v = answers.map(a => Number(a[key])).filter(n => !isNaN(n));
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : overall;
    };
    await this.saveReport({
      sessionId: sess.id,
      overall, clarity: overall, relevance: overall, depth: overall, delivery: overall,
      strengths: p.strengths || [], improvements: p.improvements || [],
      summary: 'Completed mock interview for ' + (setup.position || 'role') + ' · Score ' + overall,
      detailed: { cid: String(p.cid || ''), answers, setup, duration: p.duration, overallScore: overall }
    });
    await sb.from('interview_sessions').update({ status: 'completed', completed_at: p.completedAt || new Date().toISOString() }).eq('id', sess.id);
    return sess;
  },

  /** Retry interviews whose upload was interrupted (offline, app closed, slow network) */
  async flushPendingInterviews() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('mm_pending_interviews') || '[]') || []; } catch (_) {}
    if (!list.length) return 0;
    const left = [];
    let done = 0;
    for (const item of list) {
      try { await this.saveInterviewResult(item); done++; }
      catch (e) { console.warn('pending interview retry failed', e); left.push(item); }
    }
    try { localStorage.setItem('mm_pending_interviews', JSON.stringify(left)); } catch (_) {}
    return done;
  },

  async hydrateLocalFromCloud() {
    if (!this.isConfigured()) return;
    let s;
    try { s = this.requireUser(); } catch { return; }
    const sb = getSupabase();
    const uid = s.userId;

    try { await this.flushPendingInterviews(); } catch (_) {}

    const { data: resumes } = await sb.from('resumes')
      .select('*, resume_profiles(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1);
    if (resumes && resumes[0]) {
      const r = resumes[0];
      const prof = Array.isArray(r.resume_profiles) ? r.resume_profiles[0] : r.resume_profiles;
      const skillsRaw = prof?.skills_json;
      const technical = Array.isArray(skillsRaw) ? skillsRaw : (skillsRaw?.technical || []);
      const soft = skillsRaw?.soft || [];
      const localResume = {
        id: r.id,
        fileName: r.file_name,
        name: prof?.full_name || '',
        email: prof?.email || '',
        phone: prof?.phone || '',
        experienceYears: Number(prof?.years_experience) || 0,
        skills: { technical, soft },
        education: prof?.education_json || [],
        experience: prof?.experience_json || [],
        projects: prof?.projects_json || [],
        extractedFromFile: true
      };
      localStorage.setItem((window.STORAGE_KEYS && STORAGE_KEYS.resume) || 'ipa_resume', JSON.stringify(localResume));
    }

    const { data: jobs } = await sb.from('job_descriptions')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
    if (jobs && jobs[0]) {
      const j = jobs[0];
      localStorage.setItem((window.STORAGE_KEYS && STORAGE_KEYS.job) || 'ipa_job', JSON.stringify({
        id: j.id, position: j.title || '', company: j.company || '', description: j.raw_text || '', skills: j.skills_required || []
      }));
    }

    const { data: matches } = await sb.from('match_results')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
    if (matches && matches[0]) {
      const m = matches[0];
      localStorage.setItem((window.STORAGE_KEYS && STORAGE_KEYS.match) || 'ipa_match', JSON.stringify({
        id: m.id, score: Number(m.match_score) || 0, matched: m.matched_skills || [], missing: m.missing_skills || [],
        strengths: m.strengths_json || [], gaps: m.gaps_json || [], summary: m.ai_summary || ''
      }));
    }

    const { data: sessions } = await sb.from('interview_sessions')
      .select('*, interview_reports(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);
    if (sessions && sessions.length) {
      // Merge with local sessions so we never wipe real scores / answers
      let localSessions = [];
      try {
        localSessions = JSON.parse(localStorage.getItem((window.STORAGE_KEYS && STORAGE_KEYS.sessions) || 'ipa_sessions') || '[]') || [];
      } catch (_) { localSessions = []; }

      // Sessions that never got a report (upload interrupted) are NOT real results: never show them as 0%
      const completeOnly = sessions.filter(sess => {
        const r = Array.isArray(sess.interview_reports) ? sess.interview_reports[0] : sess.interview_reports;
        return !!r && sess.status !== 'setup';
      });
      const mapped = completeOnly.map(sess => {
        const rep = Array.isArray(sess.interview_reports) ? sess.interview_reports[0] : sess.interview_reports;
        const started = sess.started_at ? new Date(sess.started_at).getTime() : 0;
        const completed = sess.completed_at ? new Date(sess.completed_at).getTime() : 0;
        let duration = started && completed ? Math.round((completed - started) / 1000) : 0;
        let score = rep ? Number(rep.overall_score) || 0 : 0;
        const detailed = (rep && (rep.detailed_json || rep.detailed)) || {};
        let answers = (detailed && detailed.answers) || [];

        // Prefer local copy if it has a better score or answers
        const localMatch = localSessions.find(l =>
          String(l.id) === String(sess.id) ||
          (detailed && detailed.cid && String(l.id) === String(detailed.cid)) ||
          (l.position === (sess.title || 'Interview') && Math.abs(new Date(l.date || 0) - new Date(sess.completed_at || sess.created_at || 0)) < 120000)
        );
        if (localMatch) {
          if ((Number(localMatch.score) || 0) > score) score = Number(localMatch.score) || score;
          if ((localMatch.answers || []).length > (answers || []).length) answers = localMatch.answers;
          if ((Number(localMatch.duration) || 0) > duration) duration = Number(localMatch.duration) || duration;
        }
        if (score === 0 && answers && answers.length) {
          score = Math.round(answers.reduce((a, b) => a + (Number(b.score) || 0), 0) / answers.length);
        }
        if (duration < 5 && answers && answers.length) duration = Math.max(5, answers.length * 15);

        return {
          id: sess.id,
          position: sess.title || 'Interview',
          score: score,
          date: sess.completed_at || sess.created_at,
          duration: duration,
          difficulty: sess.difficulty,
          style: sess.mode,
          language: sess.language,
          numQuestions: sess.total_questions,
          answers: answers,
          strengths: rep?.strengths_json || [],
          improvements: rep?.improvements_json || [],
          summary: rep?.summary || ''
        };
      });

      // Keep pure-local sessions that aren't on the cloud yet
      const cloudIds = new Set(mapped.map(m => String(m.id)));
      const cloudCids = new Set(completeOnly.map(sess => {
        const r = Array.isArray(sess.interview_reports) ? sess.interview_reports[0] : sess.interview_reports;
        return String(((r && r.detailed_json) || {}).cid || '');
      }).filter(Boolean));
      const onlyLocal = localSessions.filter(l => l && !cloudIds.has(String(l.id)) && !cloudCids.has(String(l.id)) && (l.answers || []).length);
      const merged = mapped.concat(onlyLocal).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 40);
      localStorage.setItem((window.STORAGE_KEYS && STORAGE_KEYS.sessions) || 'ipa_sessions', JSON.stringify(merged));
    }

    const { data: prog } = await sb.from('user_progress').select('*').eq('user_id', uid).maybeSingle();
    if (prog) {
      localStorage.setItem('mm_user_progress', JSON.stringify(prog));
      const skills = prog.skills_improved;
      if (Array.isArray(skills)) {
        const cred = skills.find(x => x && x.type === 'credits');
        if (cred && typeof cred.balance === 'number') {
          localStorage.setItem('mm_credits', String(cred.balance));
        }
      }
    }
    try { await this.refreshEntitlements(); } catch (e) { console.warn('entitlements', e); }
    return true;
  },

  /** Unlocked rewards come ONLY from server-verified purchases (reward_purchases). */
  async refreshEntitlements() {
    if (!this.isConfigured()) return [];
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('reward_purchases').select('reward_id').eq('user_id', s.userId);
    if (error) throw error;
    const ids = (data || []).map(r => r.reward_id);
    localStorage.setItem('mm_redeemed', JSON.stringify(ids));
    return ids;
  },

  async syncCreditsToCloud(balance) {
    if (!this.isConfigured()) return;
    try {
      const s = this.requireUser();
      const sb = getSupabase();
      const { data: prog } = await sb.from('user_progress').select('skills_improved').eq('user_id', s.userId).maybeSingle();
      let skills = Array.isArray(prog?.skills_improved) ? prog.skills_improved.filter(x => !(x && x.type === 'credits')) : [];
      skills.push({ type: 'credits', balance: balance, updatedAt: new Date().toISOString() });
      await sb.from('user_progress').upsert({
        user_id: s.userId,
        skills_improved: skills,
        last_activity_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (e) { console.warn('syncCredits', e); }
  },

  // Redeemed/unlocked state is no longer written from the browser (see refreshEntitlements).
  async syncRedeemedToCloud() { /* intentionally a no-op */ },

  async listSessionReports() {
    if (!this.isConfigured()) return [];
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('interview_reports')
      .select('*, interview_sessions(title, difficulty, mode, language, total_questions, completed_at, started_at)')
      .eq('user_id', s.userId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  },

  async getProgress() {
    const s = this.requireUser();
    const sb = getSupabase();
    const { data, error } = await sb.from('user_progress')
      .select('*')
      .eq('user_id', s.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};

window.DB = DB;
window.getSupabase = getSupabase;

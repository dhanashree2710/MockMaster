/**
 * MOCKMASTER — Supabase client (custom users table, NO Supabase Auth)
 *
 * 1. Create project at supabase.com
 * 2. Run supabase-schema.sql in SQL Editor
 * 3. Put your URL + anon key below (Project Settings → API)
 * 4. For demo: either disable RLS on tables OR add open policies (see bottom of schema)
 */

const SUPABASE_URL = 'https://uajfitgssxwgbgaueeex.supabase.co';           // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhamZpdGdzc3h3Z2JnYXVlZWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MTg0MjcsImV4cCI6MjEwMzM5NDQyN30.BpZuSlUOkP7qvkAJjOLc-KjRboolzHI7twPg1hvJz5o';

let _client = null;

function getSupabase() {
  if (_client) return _client;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('Supabase JS not loaded. Add CDN script before this file.');
    return null;
  }
  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) {
    console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-client.js');
    return null;
  }
  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

/** Demo password hash (SHA-256). Production: hash on backend with bcrypt/argon2. */
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_KEY = 'mm_session';

const DB = {
  isConfigured() {
    return !!(getSupabase());
  },

  // ---------- Session (local, not Supabase Auth) ----------
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch { return null; }
  },
  setSession(user) {
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
      email: user.email
    }));
    return payload;
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('ipa_user');
  },
  requireUser() {
    const s = this.getSession();
    if (!s?.userId) throw new Error('Not logged in');
    return s;
  },

  // ---------- Users (login / register) ----------
  async register({ fullName, email, password }) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const password_hash = await hashPassword(password);
    const { data, error } = await sb
      .from('users')
      .insert({
        full_name: fullName,
        email: email.trim().toLowerCase(),
        password_hash
      })
      .select('id, full_name, email, role, preferred_lang, created_at')
      .single();
    if (error) throw error;
    // seed progress row
    await sb.from('user_progress').upsert({
      user_id: data.id,
      interviews_done: 0,
      skills_improved: [{ type: 'credits', balance: 100, note: 'new_user_bonus' }]
    }, { onConflict: 'user_id' });
    this.setSession(data);
    // New-user bonus credits (local wallet, scoped by user)
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
    return data;
  },

  async login({ email, password }) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const password_hash = await hashPassword(password);
    const { data, error } = await sb
      .from('users')
      .select('id, full_name, email, role, preferred_lang, is_active, password_hash')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.is_active) throw new Error('Invalid email or password');
    if (data.password_hash !== password_hash) throw new Error('Invalid email or password');
    await sb.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id);
    const user = { id: data.id, full_name: data.full_name, email: data.email, role: data.role };
    this.setSession(user);
    try { await this.hydrateLocalFromCloud(); } catch (e) { console.warn('hydrate', e); }
    return user;
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


  async hydrateLocalFromCloud() {
    if (!this.isConfigured()) return;
    let s;
    try { s = this.requireUser(); } catch { return; }
    const sb = getSupabase();
    const uid = s.userId;

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
      const mapped = sessions.map(sess => {
        const rep = Array.isArray(sess.interview_reports) ? sess.interview_reports[0] : sess.interview_reports;
        const started = sess.started_at ? new Date(sess.started_at).getTime() : 0;
        const completed = sess.completed_at ? new Date(sess.completed_at).getTime() : 0;
        return {
          id: sess.id,
          position: sess.title || 'Interview',
          score: rep ? Number(rep.overall_score) || 0 : 0,
          date: sess.completed_at || sess.created_at,
          duration: started && completed ? Math.round((completed - started) / 1000) : 0,
          difficulty: sess.difficulty,
          style: sess.mode,
          language: sess.language,
          numQuestions: sess.total_questions,
          strengths: rep?.strengths_json || [],
          improvements: rep?.improvements_json || [],
          summary: rep?.summary || ''
        };
      });
      localStorage.setItem((window.STORAGE_KEYS && STORAGE_KEYS.sessions) || 'ipa_sessions', JSON.stringify(mapped));
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
    return true;
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

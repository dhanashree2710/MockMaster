/**
 * MockMaster — AI Interview Question Agent
 * Production path: calls YOUR Supabase Edge Function (APP_CONFIG.aiProxyUrl) with the
 * user's login token — no API key ever ships in the app.
 * Optional "advanced" path: user's own Groq/Gemini/OpenAI key from Settings.
 * Generates questions tailored to resume + job description with mixed types
 * and progression basic → intermediate → advanced.
 * Falls back to local InterviewQuestions banks when key missing or API fails.
 */
(function (global) {
  function readStored(key) {
    try {
      return (localStorage.getItem(key) || '').trim();
    } catch (_) {
      return '';
    }
  }

  /**
   * Keys from localStorage (Settings page) win over empty config.js.
   * config.js stays empty so the repo is safe to push to GitHub.
   * Works on any phone/PC after the user pastes their free key once.
   */
  function getConfig() {
    const c = global.APP_CONFIG || {};
    const keys = global.STORAGE_KEYS || {};

    const storedProvider = readStored(keys.aiProvider || 'ipa_ai_provider');
    const groqKey = readStored(keys.groqApiKey || 'ipa_groq_key') || (c.groqApiKey || '').trim();
    const geminiKey = readStored(keys.geminiApiKey || 'ipa_gemini_key') || (c.geminiApiKey || '').trim();
    const openaiKey = readStored(keys.openaiApiKey || 'ipa_openai_key') || (c.openaiApiKey || '').trim();

    var provider = (storedProvider || c.aiProvider || '').toLowerCase();
    if (!provider) {
      if (groqKey) provider = 'groq';
      else if (geminiKey) provider = 'gemini';
      else if (openaiKey) provider = 'openai';
      else provider = 'groq';
    }

    return {
      provider: provider,
      groqKey: groqKey,
      groqModel: c.groqModel || 'llama-3.3-70b-versatile',
      groqBase: (c.groqBaseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
      geminiKey: geminiKey,
      geminiModel: c.geminiModel || 'gemini-2.0-flash',
      openaiKey: openaiKey,
      openaiModel: c.openaiModel || 'gpt-4o-mini',
      openaiBase: (c.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    };
  }

  function proxyUrl() {
    var c = global.APP_CONFIG || {};
    return (c.aiProxyUrl || '').trim();
  }

  function hasOwnKey() {
    var c = getConfig();
    return !!(c.groqKey || c.geminiKey || c.openaiKey);
  }

  function isConfigured() {
    if (proxyUrl()) return true;           // server-side key (recommended)
    var c = getConfig();
    if (c.provider === 'groq') return !!c.groqKey;
    if (c.provider === 'gemini') return !!c.geminiKey;
    if (c.provider === 'openai') return !!c.openaiKey;
    return hasOwnKey();
  }

  /** Call the Edge Function proxy with the signed-in user's token */
  async function chatProxy(messages, temperature) {
    var token = null;
    try { token = global.DB && DB.getAccessToken ? await DB.getAccessToken() : null; } catch (_) {}
    if (!token) throw new Error('Please sign in to use AI questions');
    var headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    try { if (typeof SUPABASE_ANON_KEY !== 'undefined') headers.apikey = SUPABASE_ANON_KEY; } catch (_) {}
    var res = await fetch(proxyUrl(), {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ messages: messages, temperature: temperature == null ? 0.6 : temperature })
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      var e = new Error(err.error || ('AI service error ' + res.status));
      e.status = res.status;
      throw e;
    }
    var data = await res.json();
    return extractJson(data.content);
  }

  function extractJson(text) {
    if (!text) throw new Error('Empty AI response');
    const cleaned = String(text).replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Could not parse JSON from AI');
    }
  }

  async function chatOpenAICompatible(baseUrl, apiKey, model, messages, temperature) {
    if (!apiKey) throw new Error('API key not configured');
    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        temperature: temperature == null ? 0.6 : temperature,
        response_format: { type: 'json_object' },
        messages: messages
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(function () { return ''; });
      throw new Error('HTTP ' + res.status + ' ' + errText.slice(0, 240));
    }
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return extractJson(content);
  }

  async function chatGemini(messages, temperature) {
    const c = getConfig();
    if (!c.geminiKey) throw new Error('Gemini API key not configured');

    var systemText = '';
    var contents = [];
    messages.forEach(function (m) {
      if (m.role === 'system') {
        systemText += (systemText ? '\n' : '') + m.content;
      } else if (m.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: m.content }] });
      } else if (m.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: m.content }] });
      }
    });
    if (systemText && contents.length) {
      contents[0].parts[0].text = systemText + '\n\n' + contents[0].parts[0].text;
    }

    var model = c.geminiModel || 'gemini-2.0-flash';
    var url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) +
      ':generateContent?key=' +
      encodeURIComponent(c.geminiKey);

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: temperature == null ? 0.6 : temperature,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!res.ok) {
      var errText = await res.text().catch(function () { return ''; });
      throw new Error('Gemini HTTP ' + res.status + ' ' + errText.slice(0, 240));
    }
    var data = await res.json();
    var text =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
    return extractJson(text);
  }

  async function chatDirect(messages, temperature) {
    var c = getConfig();
    if (c.provider === 'gemini') return chatGemini(messages, temperature);
    if (c.provider === 'groq') {
      return chatOpenAICompatible(c.groqBase, c.groqKey, c.groqModel, messages, temperature);
    }
    return chatOpenAICompatible(c.openaiBase, c.openaiKey, c.openaiModel, messages, temperature);
  }

  async function chat(messages, temperature) {
    if (proxyUrl()) {
      try {
        return await chatProxy(messages, temperature);
      } catch (e) {
        // Rate-limited or not signed in: don't silently burn a personal key.
        if (e && (e.status === 429 || e.status === 401)) throw e;
        // Proxy down / not deployed: fall back to user's own key if they set one
        if (!hasOwnKey()) throw e;
        console.warn('AI proxy unavailable, using personal key', e && e.message);
      }
    }
    return chatDirect(messages, temperature);
  }

  function toList(v) { return Array.isArray(v) ? v : (v ? String(v).split(/[,;|]/) : []); }

  function resumeSkillList(resume) {
    if (!resume) return [];
    var sk = resume.skills || {};
    var all = [].concat(
      toList(Array.isArray(sk) ? sk : null),
      toList(sk.technical), toList(sk.tools), toList(sk.frameworks), toList(sk.languages),
      toList(sk.databases), toList(sk.soft)
    ).map(function (x) { return String(x).trim(); }).filter(Boolean);
    var seen = {}; return all.filter(function (x) { var k = x.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
  }

  function resumeSummary(resume) {
    if (!resume) return 'No resume on file.';
    var skills = resumeSkillList(resume).slice(0, 40);
    var exp = (resume.experience || []).slice(0, 5).map(function (e) {
      var bits = (e.role || '') + ' at ' + (e.company || '') + ' (' + (e.duration || '') + ')';
      var resp = (e.responsibilities || e.highlights || []).slice(0, 5).map(function (r) { return String(r).slice(0, 200); });
      if (resp.length) bits += ' — ' + resp.join('; ');
      return bits;
    });
    var projects = (resume.projects || []).slice(0, 6).map(function (p) {
      var tech = Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || '');
      var desc = String(p.description || (p.highlights || []).join('; ') || '').slice(0, 300);
      return (p.name || '') + (tech ? ' [tech: ' + tech + ']' : '') + (desc ? ' — ' + desc : '');
    });
    var edu = (resume.education || []).slice(0, 2).map(function (e) {
      return [e.degree, e.field, e.institution].filter(Boolean).join(', ');
    });
    var certs = toList(resume.certifications).slice(0, 5).map(function (c) { return typeof c === 'string' ? c : (c.name || ''); });
    return [
      'Name: ' + (resume.name || ''),
      'Current role: ' + (resume.currentRole || ''),
      'Experience years: ' + (resume.experienceYears || ''),
      'Career level: ' + (resume.careerLevel || ''),
      'Skills: ' + skills.join(', '),
      'Experience:\n- ' + (exp.join('\n- ') || 'none listed'),
      'Projects:\n- ' + (projects.join('\n- ') || 'none listed'),
      edu.length ? 'Education: ' + edu.join(' | ') : '',
      certs.filter(Boolean).length ? 'Certifications: ' + certs.filter(Boolean).join(', ') : ''
    ].filter(Boolean).join('\n');
  }

  function jobSummary(job) {
    if (!job) return 'No job description.';
    var skills = (job.skills || job.requiredSkills || []).slice(0, 15);
    var preferred = (job.preferredSkills || []).slice(0, 8);
    var resp = (job.responsibilities || []).slice(0, 6);
    return [
      'Position: ' + (job.position || job.title || ''),
      'Company: ' + (job.company || ''),
      'Experience required: ' + (job.experience || ''),
      'Required skills: ' + skills.join(', '),
      'Preferred skills: ' + preferred.join(', '),
      'Responsibilities: ' + resp.join('; '),
      'Description: ' + String(job.description || job.raw_text || '').slice(0, 1500)
    ].join('\n');
  }

  /**
   * Core Question Agent — builds varied interview questions from resume + JD.
   */
  async function generateQuestions(ctx) {
    var resume = ctx.resume;
    var job = ctx.job;
    var setup = ctx.setup || {};
    var num = Math.min(15, Math.max(5, Number(setup.numQuestions) || 10));
    var position = setup.position || (job && (job.position || job.title)) || 'the target role';
    var type = setup.type || 'Technical + HR';
    var difficulty = setup.difficulty || 'Medium';
    var style = setup.style || 'Professional';
    var language = setup.language || 'en';

    var nProj = Math.min(3, ((resume && resume.projects) || []).length);
    var system = [
      'You are a senior hiring manager running a REAL interview for the position: "' + position + '".',
      'Write the exact questions you would ask THIS candidate, using ONLY facts from the CANDIDATE RESUME and JOB DESCRIPTION below.',
      '',
      'HARD RULES',
      '1. Every question must be relevant to the target position "' + position + '". Skip resume skills that are irrelevant to that position.',
      '2. Structure (in this order, adapt to the count): Q1 intro tailored to the role; then 1-2 questions on a REAL job from the resume (name the company and role); then ' +
        (nProj ? ('questions on ' + nProj + ' DIFFERENT resume projects — name each project and mention its tech/what it did, ask about design decisions, challenges, trade-offs, your own contribution; ') : 'no project questions (resume lists none); ') +
        'then practical skill questions; then 1 scenario from a JD responsibility; then 1 behavioral (STAR) tied to something in the resume; then motivation; last = closing.',
      '3. Skill questions: pick skills listed on BOTH resume and JD first, then JD-only skills (ask as a "how would you approach / how quickly could you learn" gap question), then remaining resume skills relevant to the role. ONE question per skill. Each must be a practical, specific question about that skill (a real task, debugging, design choice, trade-off) — not just "What is X?".',
      '4. Do NOT mention any project, company, tool or skill that is not in the resume or job description. Do not invent facts about the candidate.',
      '5. For non-technical roles do NOT force coding or tools the role does not use.',
      '6. Difficulty "' + difficulty + '": ' + (/hard/i.test(difficulty) ? 'deep, trade-off and edge-case questions' : /easy/i.test(difficulty) ? 'fundamentals and simple practical questions' : 'practical, intermediate depth') + '. Style: ' + style + '. Language: ' + language + '.',
      '7. NEVER repeat or paraphrase any previously asked question if a list is provided.',
      '8. Each question is ONE clear question (max 2 sentences). No numbering, no multi-part lists.',
      '9. "basedOn" = the exact skill, project name, company or JD responsibility the question targets (copied from the resume/JD). Use "" only for intro, behavioral, motivation (hr) and closing questions.',
      '10. "idealAnswer" = 2-4 sentence outline of what a strong answer to THAT question must contain. For resume/project questions use only facts present in the resume; never invent numbers.',
      '11. Return strict JSON only (no markdown):',
      '   { "questions": [ { "question": string, "type": "intro|resume|project|technical|behavioral|scenario|hr|coding|gap|closing", "level": "basic|intermediate|advanced", "basedOn": string, "idealAnswer": string } ] }',
      '12. Uniqueness token: ' + Date.now() + '.'
    ].join('\n');

    var prevAsked = [];
    try {
      if (global.InterviewQuestions && InterviewQuestions.getUsedQuestionsForJob) {
        prevAsked = InterviewQuestions.getUsedQuestionsForJob(position).slice(0, 40);
      } else {
        var jobKey = String(position || 'general').toLowerCase().slice(0, 80).replace(/\W+/g, '_');
        prevAsked = JSON.parse(localStorage.getItem('mm_used_questions_' + jobKey) || '[]').slice(0, 40);
      }
    } catch (_) {}

    var user = [
      'Target position: ' + position,
      'Interview type: ' + type,
      'Difficulty: ' + difficulty,
      'Interviewer style: ' + style,
      'Number of questions to generate: ' + num,
      'Uniqueness seed: ' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      '',
      '=== CANDIDATE RESUME ===',
      resumeSummary(resume),
      '',
      '=== JOB DESCRIPTION ===',
      jobSummary(job),
      '',
      prevAsked.length
        ? ('=== PREVIOUSLY ASKED (do NOT repeat or paraphrase) ===\n' + prevAsked.map(function (q, i) { return (i + 1) + '. ' + q; }).join('\n') + '\n')
        : '',
      'Generate exactly ' + num + ' UNIQUE interview questions for the "' + position + '" position.',
      'Ground them in the candidate\'s real projects, experience and skills above and in the job description.',
      'Do NOT invent topics, projects or tools that are not in the resume or job description.'
    ].join('\n');

    var data = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      0.7
    );

    var corpus = (resumeSummary(resume) + ' ' + jobSummary(job) + ' ' + position).toLowerCase();
    var GROUNDED = { resume: 1, project: 1, technical: 1, coding: 1, gap: 1, scenario: 1 };
    function grounded(q) {
      if (!GROUNDED[q.type]) return true;
      var b = String(q.basedOn || '').toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').trim();
      if (!b) return false;
      if (corpus.indexOf(b) !== -1) return true;
      var toks = b.split(/\s+/).filter(function (t) { return t.length > 2; });
      return toks.length > 0 && toks.some(function (t) { return corpus.indexOf(t) !== -1; });
    }
    var list = (data.questions || data.items || []).map(function (q, i) {
      return {
        id: i + 1,
        question: String(q.question || q.text || q || '').trim(),
        type: q.type || 'technical',
        level: q.level || 'intermediate',
        basedOn: String(q.basedOn || q.skill || '').trim(),
        idealAnswer: q.idealAnswer || q.betterAnswer || q.modelAnswer || '',
        domain: 'ai',
        source: getConfig().provider
      };
    }).filter(function (q) {
      return q.question && q.question.length > 8 && grounded(q);
    });

    if (!list.length) throw new Error('No questions in AI response');

    // Safety net: drop anything the candidate has already been asked, top up from local banks
    try {
      if (global.InterviewQuestions && InterviewQuestions.usedIndex) {
        var fresh = prevAsked.length
          ? list.filter(function (q) { return InterviewQuestions.usedIndex(q.question, prevAsked) < 0; })
          : list.slice();
        // Shuffle so repeated attempts do not get the same order
        for (var si = fresh.length - 1; si > 0; si--) {
          var sj = Math.floor(Math.random() * (si + 1));
          var tmp = fresh[si]; fresh[si] = fresh[sj]; fresh[sj] = tmp;
        }
        if (fresh.length < num && InterviewQuestions.buildInterviewQuestions) {
          var local = InterviewQuestions.buildInterviewQuestions(ctx) || [];
          local.forEach(function (q) {
            if (fresh.length < num && InterviewQuestions.usedIndex(q.question, prevAsked) < 0
                && !fresh.some(function (f) { return f.question === q.question; })) {
              fresh.push(q);
            }
          });
        }
        // If still short, allow oldest-asked back in last
        if (fresh.length < num && prevAsked.length) {
          list.forEach(function (q) {
            if (fresh.length < num && !fresh.some(function (f) { return f.question === q.question; })) fresh.push(q);
          });
        }
        if (fresh.length) list = fresh;
      }
    } catch (_) {}
    return list.slice(0, num);
  }

  /**
   * Grade ANSWERS against their own questions, with the candidate's resume and the JD as context.
   * ctx = { resume, job, setup, answers:[{question,type,basedOn,answer}] }
   * Returns an array aligned with ctx.answers: { score, evaluation, betterAnswer, strengths, improvement }
   * Done in batches of 5 to stay inside the per-user AI rate limit (1 call per 5 answers).
   */
  async function gradeAnswers(ctx) {
    var answers = ctx.answers || [];
    var position = (ctx.setup && ctx.setup.position) || (ctx.job && (ctx.job.position || ctx.job.title)) || 'the target role';
    var difficulty = (ctx.setup && ctx.setup.difficulty) || 'Medium';
    var language = (ctx.setup && ctx.setup.language) || 'en';
    var system = [
      'You are a strict but fair interviewer-evaluator for the position "' + position + '" (difficulty: ' + difficulty + ').',
      'For EACH numbered question/answer pair, judge the candidate\'s answer against THAT question only.',
      '',
      'SCORING (0-100): correctness and relevance to the question (50%), depth and specifics (25%), structure and clarity (15%), use of a concrete example from their own experience (10%).',
      'Empty, "I don\'t know", or off-topic answers must score below 30. A correct but shallow answer scores 40-60. Only complete, accurate, example-backed answers exceed 80.',
      '',
      'For each item return:',
      '- "evaluation": 2-3 sentences, specific to THEIR answer: what was correct, what was missing or wrong, what to add. Never generic praise.',
      '- "betterAnswer": a model answer the candidate could give to THAT exact question, in first person, 80-160 words. It must directly answer the question asked (not a different topic). For technical questions be accurate and include a short concrete example. For resume/project questions build it from the candidate\'s REAL resume facts (project names, tech, responsibilities) and use placeholders like "[add your measurable result]" instead of inventing numbers. For behavioral questions use STAR. For intro questions write a 60-90 second pitch tailored to the role and their resume.',
      '- "strengths": array of 0-2 short phrases (only if truly shown in their answer).',
      '- "improvement": one short, actionable sentence.',
      '',
      'Write evaluation, strengths, improvement and betterAnswer in language code "' + language + '".',
      'Return strict JSON only: { "results": [ { "index": number, "score": number, "evaluation": string, "betterAnswer": string, "strengths": [string], "improvement": string } ] }',
      'Return exactly one result per input item, using the same "index".'
    ].join('\n');

    var out = new Array(answers.length);
    var batches = [];
    for (var i = 0; i < answers.length; i += 5) batches.push(answers.slice(i, i + 5).map(function (a, j) { return { idx: i + j, a: a }; }));

    await Promise.all(batches.map(async function (batch) {
      var user = [
        '=== CANDIDATE RESUME ===', resumeSummary(ctx.resume), '',
        '=== JOB DESCRIPTION ===', jobSummary(ctx.job), '',
        '=== QUESTIONS AND ANSWERS ===',
        batch.map(function (it) {
          return 'ITEM ' + it.idx + '\nType: ' + (it.a.type || 'general') + (it.a.basedOn ? '\nTargets: ' + it.a.basedOn : '') +
            '\nQuestion: ' + it.a.question + '\nCandidate answer: ' + (String(it.a.answer || '').trim().slice(0, 1800) || '(empty)');
        }).join('\n\n')
      ].join('\n');
      try {
        var data = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], 0.3);
        (data.results || []).forEach(function (r) {
          var idx = Number(r.index);
          if (isNaN(idx) || idx < 0 || idx >= answers.length) return;
          var better = String(r.betterAnswer || r.suggested || '').trim();
          out[idx] = {
            score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
            evaluation: String(r.evaluation || '').trim(),
            betterAnswer: better.length > 40 ? better : '',
            strengths: Array.isArray(r.strengths) ? r.strengths.map(String).slice(0, 2) : [],
            improvement: String(r.improvement || '').trim()
          };
        });
      } catch (err) {
        console.warn('[MockMaster AI] grading batch failed', err && err.message);
      }
    }));
    return out;
  }

  /** Single-answer helper (kept for compatibility) */
  async function evaluateAnswer(ctx) {
    var res = await gradeAnswers({
      resume: ctx.resume, job: ctx.job, setup: { position: ctx.position },
      answers: [{ question: ctx.question, type: ctx.type, basedOn: ctx.basedOn, answer: ctx.answer }]
    });
    var r = res[0] || {};
    return { score: r.score || 0, evaluation: r.evaluation || '', betterAnswer: r.betterAnswer || '' };
  }

  async function buildQuestionsSmart(ctx) {
    if (isConfigured()) {
      try {
        var qs = await generateQuestions(ctx);
        if (qs && qs.length) return { questions: qs, source: getConfig().provider };
      } catch (err) {
        console.warn('[MockMaster AI] falling back to local banks:', err);
      }
    }
    if (global.InterviewQuestions && InterviewQuestions.buildInterviewQuestions) {
      return {
        questions: InterviewQuestions.buildInterviewQuestions(ctx),
        source: 'local'
      };
    }
    return { questions: [{ id: 1, type: 'intro', question: 'Tell me about yourself and your background.' },{ id: 2, type: 'behavioral', question: 'Describe a challenge you faced at work and how you handled it.' },{ id: 3, type: 'hr', question: 'Why are you interested in this role?' },{ id: 4, type: 'closing', question: 'Do you have any questions for me?' }], source: 'generic' };
  }

  global.OpenAIInterview = {
    isConfigured: isConfigured,
    generateQuestions: generateQuestions,
    evaluateAnswer: evaluateAnswer,
    gradeAnswers: gradeAnswers,
    buildQuestionsSmart: buildQuestionsSmart
  };
})(window);

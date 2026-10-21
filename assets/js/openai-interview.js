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

  function resumeSummary(resume) {
    if (!resume) return 'No resume on file.';
    var skills = []
      .concat((resume.skills && resume.skills.technical) || [])
      .concat((resume.skills && resume.skills.soft) || [])
      .concat((resume.skills && resume.skills.tools) || [])
      .concat((resume.skills && resume.skills.frameworks) || [])
      .slice(0, 20);
    var exp = (resume.experience || []).slice(0, 4).map(function (e) {
      var bits = (e.role || '') + ' at ' + (e.company || '') + ' (' + (e.duration || '') + ')';
      if (e.responsibilities && e.responsibilities.length) {
        bits += ' — ' + e.responsibilities.slice(0, 2).join('; ');
      }
      return bits;
    });
    var projects = (resume.projects || []).slice(0, 3).map(function (p) {
      return (p.name || '') + (p.tech ? ' [' + (Array.isArray(p.tech) ? p.tech.join(', ') : p.tech) + ']' : '');
    });
    return [
      'Name: ' + (resume.name || ''),
      'Current role: ' + (resume.currentRole || ''),
      'Experience years: ' + (resume.experienceYears || ''),
      'Career level: ' + (resume.careerLevel || ''),
      'Skills: ' + skills.join(', '),
      'Experience: ' + exp.join(' | '),
      'Projects: ' + projects.join(' | ')
    ].join('\n');
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

    var system = [
      'You are a senior hiring manager conducting a REAL company interview for MockMaster.',
      'You generate the exact questions the interviewer will ask — not generic quiz questions.',
      '',
      'CRITICAL RULES:',
      '1. MOST questions (at least 60%) MUST directly reference skills, tools, or responsibilities from the JOB DESCRIPTION and projects/skills from the CANDIDATE RESUME.',
      '2. Interview flow MUST feel like a real company interview:',
      '   Q1 = warm intro: welcome candidate, ask them to introduce themselves for THIS role.',
      '   Q2 = resume bridge: pick one real job or project from the resume and dig into it.',
      '   Then skill/technical questions tied to JD + resume (SQL, Power BI, Python, React, etc. as listed).',
      '   Then 1 scenario from a JD responsibility.',
      '   Then 1 behavioral (STAR).',
      '   Then motivation ("Why this role?").',
      '   Last = closing: ask if the candidate has questions.',
      '3. NEVER ask generic unrelated questions (e.g. pure HTML basics for a Data Analyst JD that lists SQL/Power BI/Python).',
      '4. Prefer skills that appear on BOTH the JD and the resume. For JD-only skills, ask a gap/learning question.',
      '5. Name real resume projects and companies when asking follow-ups.',
      '6. For technical roles: include practical problem-solving (SQL logic, dashboard design, code walk-through) — not only definitions.',
      '7. For NON-technical roles: do NOT force coding.',
      '8. NEVER repeat previously asked questions if a list is provided.',
      '9. Every question needs a strong idealAnswer (structured, with example).',
      '10. Return strict JSON only, no markdown:',
      '   { "questions": [ { "question": string, "type": "intro|resume|project|technical|behavioral|scenario|hr|coding|gap|closing", "level": "basic|intermediate|advanced", "idealAnswer": string } ] }',
      '11. Language: ' + language + '. Difficulty: ' + difficulty + '. Style: ' + style + '.',
      '12. Uniqueness token: ' + Date.now() + '.'
    ].join('\n');

    var prevAsked = [];
    try {
      var jobKey = String(position || 'general').toLowerCase().slice(0, 80).replace(/\W+/g, '_');
      prevAsked = JSON.parse(localStorage.getItem('mm_used_questions_' + jobKey) || '[]').slice(0, 25);
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
      'Generate exactly ' + num + ' UNIQUE interview questions.',
      'PRIORITY: ground questions in the JD skills and the candidate resume projects/skills listed above.',
      'Start with a company-style introduction question, then resume/project dig-in, then skill questions, then scenario, behavioral, motivation, and closing.',
      'Do NOT invent unrelated topics that are not in the JD or resume.'
    ].join('\n');

    var data = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      0.7
    );

    var list = (data.questions || data.items || []).map(function (q, i) {
      return {
        id: i + 1,
        question: q.question || q.text || String(q),
        type: q.type || 'technical',
        level: q.level || 'intermediate',
        idealAnswer: q.idealAnswer || q.betterAnswer || q.modelAnswer || '',
        domain: 'ai',
        source: getConfig().provider
      };
    }).filter(function (q) {
      return q.question && q.question.length > 8;
    });

    if (!list.length) throw new Error('No questions in AI response');
    return list.slice(0, num);
  }

  async function evaluateAnswer(ctx) {
    var system =
      'You are a strict but fair interview evaluator for Indian and global job interviews. Score 0-100. ' +
      'Very short, "I don\'t know", or off-topic answers must score below 35. ' +
      'Return JSON only: { "score": number, "evaluation": string, "betterAnswer": string } ' +
      'betterAnswer must be a complete, high-quality sample answer the candidate could have given for THIS exact question (structured, concrete, with examples). ' +
      'Write evaluation and betterAnswer in the same language as the question when possible.';

    var user = [
      'Role: ' + (ctx.position || 'candidate'),
      'Question type: ' + (ctx.type || 'general'),
      'Question: ' + ctx.question,
      'Candidate answer: ' + (ctx.answer || '(empty)')
    ].join('\n');

    var data = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      0.3
    );

    return {
      score: Math.max(0, Math.min(100, Math.round(Number(data.score) || 0))),
      evaluation: data.evaluation || '',
      betterAnswer: data.betterAnswer || data.suggested || ''
    };
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
    buildQuestionsSmart: buildQuestionsSmart
  };
})(window);

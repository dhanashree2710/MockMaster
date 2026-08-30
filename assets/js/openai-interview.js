/**
 * MockMaster — AI Interview Question Agent
 * Providers: Groq (free), Gemini (free), OpenAI (paid)
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

  function isConfigured() {
    const c = getConfig();
    if (c.provider === 'groq') return !!c.groqKey;
    if (c.provider === 'gemini') return !!c.geminiKey;
    if (c.provider === 'openai') return !!c.openaiKey;
    return !!(c.groqKey || c.geminiKey || c.openaiKey);
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

  async function chat(messages, temperature) {
    var c = getConfig();
    if (c.provider === 'gemini') return chatGemini(messages, temperature);
    if (c.provider === 'groq') {
      return chatOpenAICompatible(c.groqBase, c.groqKey, c.groqModel, messages, temperature);
    }
    return chatOpenAICompatible(c.openaiBase, c.openaiKey, c.openaiModel, messages, temperature);
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
      'You are an expert AI interview coach for MockMaster, specialized in realistic Indian and global job interviews.',
      'Your job is to act as a QUESTION GENERATION AGENT.',
      '',
      'CRITICAL RULES:',
      '1. Generate questions that are STRICTLY tailored to the TARGET POSITION, JOB DESCRIPTION, and CANDIDATE RESUME.',
      '2. Do NOT force software-development or coding questions unless the role is clearly technical (developer, engineer, SDE, data scientist, etc.).',
      '3. Match the actual domain: Data Analyst → SQL/Excel/BI/stats; HR → recruiting/people; Trainer → facilitation; Marketing → campaigns/metrics; Sales → process/pipeline; etc.',
      '4. Use the candidate\'s real experience, projects, and skills from the resume to personalize questions (e.g. "On your resume you worked on X — tell me about...").',
      '5. Where the job asks for skills the candidate lacks, include 1–2 gap/learning questions.',
      '6. Progress clearly: intro → basic → intermediate → advanced → scenario/practical → closing.',
      '7. Mix question TYPES in the set (do not output only one type):',
      '   - intro (1)',
      '   - technical / domain knowledge (several)',
      '   - behavioral / HR (at least 1–2 if type includes HR)',
      '   - scenario / situational (at least 1–2)',
      '   - coding (only if role is technical and interview type includes technical/coding)',
      '   - gap (skills missing vs JD)',
      '   - closing (1)',
      '8. For EVERY question also provide a strong model answer (idealAnswer) — concrete, structured, with examples where relevant.',
      '9. Return strict JSON only, no markdown fences:',
      '   { "questions": [ { "question": string, "type": "intro|technical|behavioral|scenario|hr|coding|gap|closing", "level": "basic|intermediate|advanced", "idealAnswer": string } ] }',
      '10. Write questions AND ideal answers in language code: ' + language + ' (en = natural Indian English phrasing, hi = Hindi, etc.).',
      '11. Difficulty overall should match: ' + difficulty + '. Style of questions: ' + style + '.'
    ].join('\n');

    var user = [
      'Target position: ' + position,
      'Interview type: ' + type,
      'Difficulty: ' + difficulty,
      'Interviewer style: ' + style,
      'Number of questions to generate: ' + num,
      '',
      '=== CANDIDATE RESUME ===',
      resumeSummary(resume),
      '',
      '=== JOB DESCRIPTION ===',
      jobSummary(job),
      '',
      'Generate exactly ' + num + ' high-quality, varied interview questions now.'
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
    return { questions: global.MOCK_QUESTIONS || [], source: 'mock' };
  }

  global.OpenAIInterview = {
    isConfigured: isConfigured,
    generateQuestions: generateQuestions,
    evaluateAnswer: evaluateAnswer,
    buildQuestionsSmart: buildQuestionsSmart
  };
})(window);

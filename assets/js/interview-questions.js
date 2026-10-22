/**
 * Role-aware interview questions.
 * Priority: Target Position + Job Description, then Resume skills for personalization.
 * Progression: basic → intermediate → advanced + practical + coding (when technical).
 */
(function () {
  function matchDomain(text) {
    const t = String(text || '').toLowerCase();
    if (!t.trim()) return null;
    // Check role keywords carefully — order by specificity of ROLE not random skills
    if (/data\s*analyst|business\s*analyst|data\s*scien|machine\s*learning|\bml\s*engineer|power\s*bi|tableau|data\s*engineer/i.test(t)) return 'data';
    if (/front\s*-?\s*end|frontend|react\s*developer|angular\s*developer|vue\s*developer|ui\s*developer/i.test(t)) return 'frontend';
    if (/back\s*-?\s*end|backend|node\.?js\s*developer|django|spring\s*boot|java\s*developer|python\s*developer|api\s*developer/i.test(t)) return 'backend';
    if (/full\s*-?\s*stack/i.test(t)) return 'fullstack';
    if (/\bhr\b|human\s*resource|recruiter|talent\s*acquisition/i.test(t)) return 'hr';
    if (/\btrainer\b|training\s*&\s*development|\bl&d\b|instructional\s*design/i.test(t)) return 'training';
    if (/\bqa\b|test\s*engineer|sdet|automation\s*test/i.test(t)) return 'qa';
    if (/devops|sre|cloud\s*engineer|kubernetes/i.test(t)) return 'devops';
    if (/system\s*design|software\s*architect/i.test(t)) return 'system_design';
    return null;
  }

  function detectDomain(position, job, resume, setup) {
    // 1) Target position from setup wins (what user selected for THIS interview)
    const fromPosition = matchDomain(position) || matchDomain(setup && setup.position);
    if (fromPosition) return fromPosition;

    // 2) Interview type override
    const type = String((setup && setup.type) || '').toLowerCase();
    if (/frontend focus|html\/css\/js/i.test(type)) return 'frontend';
    if (/backend focus/i.test(type)) return 'backend';
    if (/full stack/i.test(type)) return 'fullstack';
    if (/data|analytics/i.test(type)) return 'data';
    if (/training|l&d/i.test(type)) return 'training';
    if (/hr|behavioral/i.test(type) && !/technical/.test(type)) return 'hr';

    // 3) Job title only (not full JD text — JD skills can pollute domain)
    const fromJobTitle = matchDomain(job && (job.position || job.title));
    if (fromJobTitle) return fromJobTitle;

    // 4) Resume current role
    const fromResume = matchDomain(resume && resume.currentRole);
    if (fromResume) return fromResume;

    // 5) Soft fallback from JD skills only if clear
    const skills = ((job && job.skills) || []).join(' ').toLowerCase();
    if (/excel|sql|tableau|power bi|python|statistics|dashboard/i.test(skills) && !/react|html|css/i.test(skills)) return 'data';
    if (/react|html|css|javascript/i.test(skills) && !/sql|tableau|excel/i.test(skills)) return 'frontend';

    return 'general';
  }

  const BANKS = {
    frontend: {
      basic: [
        'What is HTML and why is it used?',
        'What is the difference between HTML tags and attributes?',
        'What are semantic HTML elements? Give examples.',
        'What is the difference between <div> and <span>?',
        'What is CSS?',
        'Explain the CSS Box Model.',
        'What is the difference between class and id in CSS?',
        'What is responsive web design?',
        'What is Bootstrap and why is it used?',
        'What is the difference between inline, internal, and external CSS?'
      ],
      intermediate: [
        'What is JavaScript?',
        'What is the difference between var, let, and const?',
        'What are the main JavaScript data types?',
        'What is a function? What is an arrow function?',
        'What is the difference between == and ===?',
        'What is DOM manipulation? Give an example.',
        'What are events in JavaScript? What is event bubbling?',
        'What are Promises? How does async/await work?',
        'What is JSON and where do you use it in front-end apps?',
        'What is the difference between null and undefined?',
        'What is hoisting in JavaScript?',
        'What is a callback function?'
      ],
      advanced: [
        'What is React and what problem does it solve?',
        'What is a React component? Difference between functional and class components?',
        'What is the difference between props and state?',
        'What are React Hooks? Explain useState and useEffect.',
        'What is the Virtual DOM and how does reconciliation work?',
        'Why are keys used in React lists?',
        'What is conditional rendering in React?',
        'How do you call an API from a React application?',
        'How would you manage global state in a mid-size React app?',
        'How do you optimize performance in a React application with large lists?'
      ],
      practical: [
        'How would you make a website fully responsive across mobile, tablet, and desktop?',
        'How would you improve a slow-loading website?',
        'How would you validate a form using JavaScript?',
        'How would you handle an API failure in the UI?',
        'How would you make a website accessible (a11y)?',
        'How do you debug a JavaScript error in the browser?',
        'How would you implement dark/light mode?',
        'How would you prevent unnecessary API calls (debouncing, caching)?',
        'How would you optimize images for the web?',
        'How would you structure a large front-end project (folders, components, services)?'
      ],
      coding: [
        'How would you reverse a string in JavaScript? Talk through the code.',
        'How do you find the largest number in an array without using Math.max?',
        'How do you remove duplicate values from an array? Compare Set vs filter approach.',
        'How would you check if a string is a palindrome?',
        'Write logic to flatten a nested array one level deep.',
        'How would you debounce a search input in JavaScript?',
        'Explain how you would implement a deep clone of a plain object.',
        'How would you find the first non-repeating character in a string?',
        'Describe an algorithm to check if two strings are anagrams.',
        'How would you implement a simple Promise-based retry helper?',
        'Describe how you would build a counter with increment/decrement in JavaScript or React.',
        'How would you fetch users from an API and display them in a list with loading and error states?',
        'How would you implement client-side search/filter on a list of items efficiently?',
        'Walk through code to group an array of objects by a key (e.g. by department).',
        'How would you detect a cycle in a linked-list style structure in JS?'
      ]
    },
    backend: {
      basic: [
        'What is a REST API?',
        'Difference between GET, POST, PUT, and DELETE?',
        'What is JSON?',
        'What is the difference between SQL and NoSQL databases?',
        'What is authentication vs authorization?'
      ],
      intermediate: [
        'Explain middleware in Express (or your framework).',
        'How do you handle errors in an API?',
        'What is JWT and how does it work?',
        'How do you prevent SQL injection?',
        'What is indexing in databases and why does it matter?'
      ],
      advanced: [
        'How would you design pagination for a large dataset?',
        'Explain caching strategies for APIs.',
        'How do you design rate limiting?',
        'How would you structure a scalable Node.js / backend service?',
        'Describe how you would handle background jobs or queues.'
      ],
      practical: [
        'An API is returning 500 for some users. How do you debug?',
        'How would you version an API?',
        'How do you secure secrets and environment configuration?'
      ],
      coding: [
        'Write logic to reverse a linked list and explain time complexity.',
        'How would you find the middle element of a linked list in one pass?',
        'Explain how you would detect a cycle in a linked list (Floyd algorithm).',
        'How would you implement a stack using two queues (or vice versa)?',
        'Write logic for binary search and discuss edge cases.',
        'How would you find the first duplicate in an array efficiently?',
        'Explain how you would design a rate limiter for an API.',
        'How would you implement pagination for a large dataset endpoint?',
        'Walk through validating and hashing a password before storing it.',
        'How would you design a simple in-memory cache with TTL?',
        'Write SQL or describe logic to find the second highest salary.',
        'How would you handle concurrent updates to the same database row?',
        'Explain an algorithm to merge two sorted arrays into one sorted array.',
        'How would you implement exponential backoff for failed API retries?',
        'Describe how you would find all pairs in an array that sum to a target K.'
      ]
    },

    data: {
      basic: [
        'What is the difference between a database and a spreadsheet?',
        'What is SQL? Why do analysts use it?',
        'What is the difference between WHERE and HAVING in SQL?',
        'Explain primary key and foreign key.',
        'What is data cleaning? Give examples of common data quality issues.',
        'What is the difference between a bar chart and a histogram?',
        'What is Excel VLOOKUP (or XLOOKUP)? When would you use it?',
        'What is a pivot table and why is it useful?',
        'What is the difference between mean, median, and mode?',
        'What does ETL mean in a data pipeline?'
      ],
      intermediate: [
        'Write the idea behind an SQL JOIN. When do you use INNER vs LEFT JOIN?',
        'How do you handle missing values in a dataset?',
        'What is normalization in databases (in simple terms)?',
        'How would you find duplicate records in a table?',
        'Explain GROUP BY with an example business question.',
        'What is a KPI? Give examples for an e-commerce business.',
        'How do you validate that a dashboard number is correct?',
        'Difference between structured and unstructured data?',
        'What is correlation vs causation?',
        'How would you use Power BI or Tableau in a typical reporting workflow?'
      ],
      advanced: [
        'How would you design metrics for measuring customer churn?',
        'Explain window functions in SQL (e.g. ROW_NUMBER, running totals) at a high level.',
        'How do you choose the right visualization for a stakeholder story?',
        'A stakeholder says the dashboard is "wrong". How do you investigate?',
        'How would you build a simple cohort analysis?',
        'What is A/B testing and what can go wrong in interpreting results?',
        'How do you optimize a slow SQL query?',
        'Describe a data model you would use for sales reporting (facts vs dimensions).'
      ],
      practical: [
        'You receive a messy Excel export of orders. Walk me through cleaning and analyzing it.',
        'How would you explain a drop in weekly revenue using data?',
        'Design a simple dashboard for sales managers — what charts and filters?',
        'SQL task: how would you get the top 5 products by revenue last month?',
        'How would you automate a weekly KPI email using Excel or a BI tool?'
      ],
      coding: [
        'How would you calculate month-over-month growth in SQL or Excel?',
        'Describe logic to remove duplicates and keep the latest record per customer.',
        'How do you compute a running total in Excel or SQL?',
        'How would you flag outliers in a numeric column?'
      ]
    },
    training: {
      basic: [
        'How do you assess a learner’s skill level before designing a session?',
        'What makes training engaging for adult learners?',
        'How do you handle a disruptive or disengaged participant?'
      ],
      intermediate: [
        'Walk me through designing a multi-day corporate training curriculum.',
        'How do you measure training effectiveness after delivery?',
        'How do you customize content for students vs working professionals?'
      ],
      advanced: [
        'How would you scale a pilot workshop to many corporate batches?',
        'How do you align L&D programs with business KPIs?',
        'Describe improving a program using assessment data and feedback.'
      ],
      practical: [
        'A client needs a 2-day workshop for mixed-skill participants next month. Outline agenda, assessment, and delivery.'
      ],
      coding: []
    },
    hr: {
      basic: [
        'What is the full recruitment cycle?',
        'Difference between job description and job specification?',
        'What is employee engagement?'
      ],
      intermediate: [
        'How do you screen resumes for a technical role?',
        'How do you handle a difficult conversation with an employee?',
        'What metrics do you track in recruitment?'
      ],
      advanced: [
        'How would you reduce time-to-hire without hurting quality?',
        'How do you build an employer brand for hard-to-fill roles?'
      ],
      practical: [
        'Two candidates score equally. How do you decide?'
      ],
      coding: []
    },
    general: {
      basic: [
        'Tell me about a core concept from your primary skill area.',
        'What tools do you use daily in your role?',
        'How do you stay updated in your field?'
      ],
      intermediate: [
        'Describe a challenging project and your contribution.',
        'How do you prioritize when multiple stakeholders need you?',
        'How do you document processes or decisions?'
      ],
      advanced: [
        'Describe a strategic decision you influenced with data.',
        'How would you improve productivity on your team?'
      ],
      practical: [
        'Walk me through how you would approach an unfamiliar problem at work.'
      ],
      coding: []
    }
  };

  BANKS.fullstack = {
    basic: BANKS.frontend.basic.slice(0, 5).concat(BANKS.backend.basic.slice(0, 3)),
    intermediate: BANKS.frontend.intermediate.slice(0, 5).concat(BANKS.backend.intermediate.slice(0, 3)),
    advanced: BANKS.frontend.advanced.slice(0, 4).concat(BANKS.backend.advanced.slice(0, 3)),
    practical: BANKS.frontend.practical.slice(0, 3).concat(BANKS.backend.practical.slice(0, 2)),
    coding: BANKS.frontend.coding.slice(0, 3)
  };

  const BEHAVIORAL = [
    'Tell me about a time you had to learn a new tool quickly to deliver on time.',
    'Describe a conflict with a teammate and how you resolved it.',
    'Give an example of receiving critical feedback and what you changed.',
    'Tell me about a time you mentored or helped a colleague succeed.',
    'Describe a situation where you missed a deadline — what did you learn?'
  ];

  function resumeBits(resume) {
    const exp0 = resume?.experience?.[0];
    const skills = []
      .concat(resume?.skills?.technical || [])
      .concat(resume?.skills?.languages || [])
      .concat(resume?.skills?.frameworks || []);
    return { exp0, skills: [...new Set(skills)].slice(0, 8) };
  }

  // Deterministic-but-unique shuffle per interview session
  function sessionSeed() {
    try {
      let s = sessionStorage.getItem('mm_q_seed');
      if (!s) {
        s = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
        sessionStorage.setItem('mm_q_seed', s);
      }
      return s;
    } catch (_) {
      return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
    }
  }

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function take(arr, n) {
    if (!arr || !arr.length || n <= 0) return [];
    const seed = hashStr(sessionSeed() + '|' + arr[0] + '|' + arr.length + '|' + n);
    const rnd = mulberry32(seed);
    return shuffle(arr, rnd).slice(0, Math.min(n, arr.length));
  }

  /** Call at start of each new interview so questions change */
  function resetQuestionSeed() {
    try { sessionStorage.removeItem('mm_q_seed'); } catch (_) {}
  }

  function usedKeyFor(position) {
    return 'mm_used_questions_' + String(position || 'general').toLowerCase().replace(/[*_`#]+/g, '').trim().slice(0, 80).replace(/\W+/g, '_');
  }
  const USED_GLOBAL_KEY = 'mm_used_questions_all';

  /** Questions asked before: this job first, then recent ones from ANY interview (most recent first). */
  function getUsedQuestionsForJob(position) {
    function read(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (_) { return []; } }
    const own = read(usedKeyFor(position));
    const all = read(USED_GLOBAL_KEY).slice(0, 60);
    const seen = {};
    return own.concat(all).filter(function (q) {
      const k = String(q || '').slice(0, 160);
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  /** Remember questions so the next attempt for the same job gets different ones. */
  function markQuestionsUsed(position, list) {
    try {
      const texts = (list || []).map(function (q) { return String((q && q.question) || q || '').trim().slice(0, 300); }).filter(Boolean);
      if (!texts.length) return;
      function merge(k, cap) {
        let prev = [];
        try { prev = JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (_) {}
        const merged = texts.concat(prev).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).slice(0, cap);
        localStorage.setItem(k, JSON.stringify(merged));
      }
      merge(usedKeyFor(position), 120);
      merge(USED_GLOBAL_KEY, 200);
    } catch (_) {}
  }

  function normQ(t) { return String(t || '').toLowerCase().replace(/\W+/g, ' ').replace(/\s+/g, ' ').trim(); }

  /** Index in the used list (0 = asked most recently) or -1 when never asked. */
  function usedIndex(q, used) {
    if (!used || !used.length) return -1;
    const nq = normQ(q);
    for (let i = 0; i < used.length; i++) {
      const nu = normQ(used[i]);
      if (!nu) continue;
      if (nq === nu) return i;
      if (nu.length >= 60 && (nq.indexOf(nu.slice(0, 100)) === 0 || nu.indexOf(nq.slice(0, 100)) === 0)) return i;
      if (isTooSimilar(q, used[i])) return i;
    }
    return -1;
  }

  /**
   * Pick n questions: never-asked first (shuffled per interview), then the ones asked LONGEST ago.
   * This is what stops the same questions coming back on every attempt.
   */
  function pickFresh(pool, used, n) {
    const uniq = (pool || []).filter(function (q, i, a) { return q && a.indexOf(q) === i; });
    const fresh = [], old = [];
    uniq.forEach(function (q) {
      const ix = usedIndex(q, used);
      if (ix < 0) fresh.push(q); else old.push({ q: q, ix: ix });
    });
    const out = take(fresh, n);
    if (out.length < n) {
      old.sort(function (x, y) { return y.ix - x.ix; });      // oldest-asked first
      old.forEach(function (o) { if (out.length < n) out.push(o.q); });
    }
    return out;
  }

  function isTooSimilar(a, b) {
    const na = String(a || '').toLowerCase().replace(/\W+/g, ' ').trim();
    const nb = String(b || '').toLowerCase().replace(/\W+/g, ' ').trim();
    if (!na || !nb) return false;
    if (na === nb) return true;
    // overlap of significant words
    const wa = na.split(/\s+/).filter(w => w.length > 3);
    const wb = new Set(nb.split(/\s+/).filter(w => w.length > 3));
    if (wa.length < 3) return false;
    let hits = 0;
    wa.forEach(w => { if (wb.has(w)) hits++; });
    return hits / wa.length >= 0.7;
  }

  function filterUnused(pool, used) {
    if (!pool || !pool.length) return [];
    return pickFresh(pool, used, pool.length);
  }

  /** Skill → realistic interview question templates (JD / resume driven) */
  const SKILL_Q = {
    sql: [
      'Walk me through how you would write a SQL query to find the top 5 customers by revenue this quarter, including any JOINs you would use.',
      'Explain the difference between INNER JOIN and LEFT JOIN with an example from a real reporting scenario.',
      'How do you optimize a slow SQL query? What would you check first?'
    ],
    excel: [
      'Describe a dashboard or report you built in Excel. Which formulas or Pivot Tables did you use?',
      'How would you use VLOOKUP or XLOOKUP and Pivot Tables to clean and summarize messy sales data?',
      'Explain how you would detect and handle duplicates and missing values in a large Excel file.'
    ],
    'power bi': [
      'Walk me through a Power BI report you built — data sources, data model, and key visuals.',
      'How do you use DAX measures vs calculated columns? Give a concrete example.',
      'How would you design a Power BI dashboard for management KPIs for this role?'
    ],
    tableau: [
      'Describe a Tableau dashboard you created and the business question it answered.',
      'How do you choose chart types in Tableau for different stakeholders?'
    ],
    python: [
      'Tell me about a Python script or analysis you wrote for work or a project. What libraries did you use?',
      'How would you use pandas to clean a CSV with missing values and then compute summary statistics?',
      'Explain a time you automated a repetitive task with Python.'
    ],
    javascript: [
      'Explain a feature you built with JavaScript. How did you structure the code?',
      'What is the difference between var, let, and const, and when do you use each?',
      'How do you handle asynchronous operations in JavaScript (Promises / async-await)?'
    ],
    react: [
      'Walk me through a React component you built. How did you manage state and props?',
      'When would you use useEffect, and how do you avoid unnecessary re-renders?',
      'How do you structure a mid-size React app (folders, components, state)?'
    ],
    html: [
      'What are semantic HTML elements and why do they matter for accessibility and SEO?',
      'How do you structure a responsive page with HTML and CSS?'
    ],
    css: [
      'Explain the CSS box model and how you use Flexbox or Grid for layouts.',
      'How do you approach responsive design for mobile and desktop?'
    ],
    java: [
      'Describe an application or module you built in Java. What design patterns did you use?',
      'Explain OOP concepts (encapsulation, inheritance, polymorphism) with a work example.'
    ],
    node: [
      'Walk me through a Node.js API you built. How did you handle routing and errors?',
      'How do you structure a REST API in Node and connect it to a database?'
    ],
    api: [
      'Explain how you design or consume REST APIs. Give an example from a project.',
      'How do you handle authentication and error responses when calling external APIs?'
    ],
    aws: [
      'Which AWS services have you used, and for what use case?',
      'How would you deploy a simple web app on AWS?'
    ],
    git: [
      'How do you use Git in a team — branching, pull requests, and resolving conflicts?'
    ],
    testing: [
      'How do you approach testing (unit, integration, manual)? Give an example from a project.',
      'Describe a bug you found and how you isolated and fixed it.'
    ]
  };

  function normalizeSkill(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function skillKey(s) {
    const n = normalizeSkill(s);
    if (/power\s*bi|powerbi/.test(n)) return 'power bi';
    if (/tableau/.test(n)) return 'tableau';
    if (/\bsql\b|mysql|postgres|tsql/.test(n)) return 'sql';
    if (/excel|spreadsheet|vlookup|pivot/.test(n)) return 'excel';
    if (/python|pandas|numpy/.test(n)) return 'python';
    if (/react|redux|next\.?js/.test(n)) return 'react';
    if (/javascript|typescript|\bjs\b/.test(n)) return 'javascript';
    if (/\bhtml\b/.test(n)) return 'html';
    if (/\bcss\b|tailwind|bootstrap/.test(n)) return 'css';
    if (/\bjava\b(?!script)/.test(n)) return 'java';
    if (/node\.?js|express/.test(n)) return 'node';
    if (/\bapi\b|rest|graphql/.test(n)) return 'api';
    if (/aws|azure|gcp|cloud/.test(n)) return 'aws';
    if (/\bgit\b|github|gitlab/.test(n)) return 'git';
    if (/test|qa|selenium|jest|cypress/.test(n)) return 'testing';
    return n.split(' ')[0] || n;
  }

  const SKILL_ANGLES = [
    function (l, p) { return 'This role requires ' + l + '. Tell me about a project or task where you used ' + l + ', and what the outcome was.'; },
    function (l, p) { return 'How would you apply ' + l + ' day-to-day in a ' + p + ' role? Give a concrete example.'; },
    function (l, p) { return 'What are the most common mistakes people make with ' + l + ', and how do you avoid them?'; },
    function (l, p) { return 'How would you explain ' + l + ' to a non-technical stakeholder who needs to make a decision based on your work?'; },
    function (l, p) { return 'Describe a time ' + l + ' did not work the way you expected. How did you troubleshoot it?'; },
    function (l, p) { return 'How do you check that your ' + l + ' work is accurate and reliable before sharing it with others?'; },
    function (l, p) { return 'What is one advanced or lesser-known feature of ' + l + ' you have used, and why did it help?'; },
    function (l, p) { return 'If you had to teach ' + l + ' to a new teammate in one week, what would your plan be?'; },
    function (l, p) { return 'Compare ' + l + ' with an alternative you have used. When would you choose each for a ' + p + ' task?'; },
    function (l, p) { return 'How have you improved the speed, quality or cost of a task by using ' + l + '? What was the measurable result?'; }
  ];

  function questionsForSkill(skill, position) {
    const key = skillKey(skill);
    const templates = SKILL_Q[key];
    const label = String(skill).trim();
    const base = (templates && templates.length) ? templates.slice() : [];
    if (!label || label.length < 2) return base;
    return base.concat(SKILL_ANGLES.map(function (f) { return f(label, position); }));
  }

  function collectJobSkills(job) {
    const raw = []
      .concat(job && job.skills || [])
      .concat(job && job.requiredSkills || [])
      .concat(job && job.preferredSkills || []);
    const desc = String((job && (job.description || job.raw_text)) || '').toLowerCase();
    const tokens = ['sql', 'excel', 'power bi', 'tableau', 'python', 'javascript', 'react', 'html', 'css',
      'java', 'node', 'aws', 'git', 'api', 'rest', 'pandas', 'dax', 'pivot'];
    tokens.forEach(function (t) { if (desc.indexOf(t) !== -1) raw.push(t); });
    const seen = {};
    const out = [];
    raw.forEach(function (s) {
      const k = skillKey(s);
      if (k && !seen[k] && String(s).trim().length > 1) {
        seen[k] = true;
        out.push(String(s).trim());
      }
    });
    return out.slice(0, 12);
  }

  function collectResumeSkills(resume) {
    return []
      .concat((resume && resume.skills && resume.skills.technical) || [])
      .concat((resume && resume.skills && resume.skills.tools) || [])
      .concat((resume && resume.skills && resume.skills.frameworks) || [])
      .concat((resume && resume.skills && resume.skills.languages) || [])
      .map(String)
      .filter(Boolean)
      .slice(0, 15);
  }

  function resumeProjects(resume) {
    return ((resume && resume.projects) || []).slice(0, 4).map(function (p) {
      return {
        name: p.name || p.title || 'a project',
        tech: Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || p.technologies || ''),
        desc: p.description || p.summary || ''
      };
    });
  }

  function buildInterviewQuestions({ resume, job, setup }) {
    // Company-style interview: intro → resume/JD → skill questions → scenario → behavioral → closing
    resetQuestionSeed();
    const num = Math.min(20, Math.max(5, Number(setup && setup.numQuestions) || 10));
    const type = String((setup && setup.type) || 'Technical + HR').toLowerCase();
    const difficulty = String((setup && setup.difficulty) || 'Medium').toLowerCase();
    const position = (setup && setup.position) || (job && (job.position || job.title)) || 'this role';
    const company = String((job && job.company) || '').trim();
    const name = String((resume && resume.name) || 'there').split(/\s+/)[0];
    const domain = detectDomain(position, job, resume, setup);
    const bank = BANKS[domain] || BANKS.general;
    const bits = resumeBits(resume || {});
    const exp0 = bits.exp0;
    const usedQs = getUsedQuestionsForJob(position);

    const jobSkills = collectJobSkills(job || {});
    const resumeSkills = collectResumeSkills(resume || {});
    const projects = resumeProjects(resume || {});
    const responsibilities = ((job && job.responsibilities) || []).map(String).filter(function (r) { return r.length > 20; }).slice(0, 6);

    const overlap = jobSkills.filter(function (js) {
      return resumeSkills.some(function (rs) {
        const a = normalizeSkill(js), b = normalizeSkill(rs);
        return a.indexOf(b) !== -1 || b.indexOf(a) !== -1 || skillKey(js) === skillKey(rs);
      });
    });
    const missing = jobSkills.filter(function (js) {
      return !resumeSkills.some(function (rs) {
        const a = normalizeSkill(js), b = normalizeSkill(rs);
        return a.indexOf(b) !== -1 || b.indexOf(a) !== -1 || skillKey(js) === skillKey(rs);
      });
    });

    const wantTech = /technical|coding|system|full\s*stack|frontend|backend|data/i.test(type) || type.indexOf('technical') !== -1 ||
      ['frontend', 'backend', 'fullstack', 'data', 'qa', 'devops'].indexOf(domain) !== -1;
    const wantHr = true;
    const wantCoding = /coding|technical/i.test(type) || ['frontend', 'fullstack', 'backend', 'data', 'qa', 'devops'].indexOf(domain) !== -1;

    const questions = [];
    let id = 1;
    function push(q, meta) {
      if (questions.length >= num) return;
      const text = String(q || '').trim();
      if (!text || text.length < 12) return;
      if (questions.some(function (x) { return isTooSimilar(x.question, text); })) return;
      questions.push(Object.assign({ id: id++ }, meta, { question: text }));
    }

    // 1) Company-style intro (rotating wording so attempts do not start identically)
    const companyBit = company ? (' at ' + company) : '';
    function variant(list, meta) {
      const pick = pickFresh(list, usedQs, 1)[0];
      if (pick) push(pick, meta);
    }
    variant([
      'Hello ' + name + ', thank you for joining us today. I am conducting this interview for the ' + position + ' position' + companyBit + '. Please introduce yourself and walk me through your background, focusing on experience relevant to this role.',
      'Welcome ' + name + '! Let us begin with a quick introduction. Tell me about yourself and what led you to apply for the ' + position + ' role' + companyBit + '.',
      'Good to meet you, ' + name + '. To start, could you give me a short overview of your journey so far and why the ' + position + ' position' + companyBit + ' interests you?',
      'Hi ' + name + ', thanks for making the time. Walk me through your career or studies so far, and highlight the parts that make you a fit for this ' + position + ' role.',
      'Let us start with you, ' + name + '. Who are you professionally, what are you strongest at, and why are you targeting a ' + position + ' position?',
      'Hello ' + name + '. Before we go into details, please tell me about yourself in two minutes: background, key skills, and what you want next as a ' + position + '.'
    ], { type: 'intro', level: 'basic', domain: domain });

    // 2) Resume bridge
    if (exp0 && questions.length < num) {
      const where = exp0.role + (exp0.company ? ' at ' + exp0.company : '') + (exp0.duration ? ' (' + exp0.duration + ')' : '');
      variant([
        'I see on your resume you worked as ' + where + '. How does that experience prepare you for a ' + position + ' role' + companyBit + '?',
        'Your resume mentions ' + where + '. What was your biggest achievement there, and how does it apply to this ' + position + ' position?',
        'Tell me more about your time as ' + where + '. Which responsibilities from that job are most relevant to this ' + position + ' role?',
        'Looking at your experience as ' + where + ', what did you learn there that you would bring to our team?'
      ], { type: 'resume', level: 'basic', domain: domain });
    }
    if (projects.length && questions.length < num) {
      const projList = [];
      projects.slice(0, 4).forEach(function (proj) {
        const withTech = proj.tech ? ' using ' + proj.tech : '';
        projList.push('You listed a project called "' + proj.name + '"' + withTech + '. Walk me through your role, the problem you solved, and the result.');
        projList.push('Tell me about the "' + proj.name + '" project' + withTech + '. What was the hardest part, and how did you handle it?');
        projList.push('In your "' + proj.name + '" project, what would you do differently if you rebuilt it today?');
      });
      variant(projList, { type: 'project', level: 'intermediate', domain: domain });
    }

    // 3) JD + resume skill questions (majority of interview)
    const skillOrder = overlap
      .concat(jobSkills.filter(function (s) { return overlap.indexOf(s) === -1; }))
      .concat(resumeSkills.filter(function (s) {
        return !jobSkills.some(function (j) { return skillKey(j) === skillKey(s); });
      }));

    const skillQBudget = Math.max(3, Math.min(num - 3, Math.floor(num * 0.55)));
    let skillQCount = 0;
    const skillPool = [];
    skillOrder.forEach(function (sk) {
      questionsForSkill(sk, position).forEach(function (q) { skillPool.push(q); });
    });
    pickFresh(skillPool, usedQs, skillQBudget + 4).forEach(function (q) {
      if (skillQCount >= skillQBudget) return;
      push(q, { type: 'technical', level: difficulty === 'easy' ? 'basic' : 'intermediate', domain: domain });
      skillQCount++;
    });

    // 4) JD responsibility scenario
    if (responsibilities.length && questions.length < num - 1) {
      const scnList = [];
      responsibilities.forEach(function (r) {
        const t = r.slice(0, 160);
        scnList.push('One of the responsibilities for this ' + position + ' role is: "' + t + '". How would you approach this in your first 90 days?');
        scnList.push('The job description says: "' + t + '". Describe a similar task you have handled and how you would do it here.');
        scnList.push('Imagine you are given this responsibility on day one: "' + t + '". What questions would you ask and what would be your plan?');
      });
      variant(scnList, { type: 'scenario', level: 'advanced', domain: domain });
    } else if (jobSkills.length && questions.length < num - 1) {
      variant([
        'Looking at this ' + position + ' job description, which of your past projects best matches what we need, and why?',
        'Which requirement in this ' + position + ' job description are you strongest at, and can you prove it with an example?',
        'If you joined as our ' + position + ', what would you deliver in the first month to show you were the right hire?'
      ], { type: 'job', level: 'intermediate', domain: domain });
    }

    // 5) Skill gap
    if (missing.length && questions.length < num - 1) {
      const m = missing.slice(0, 3).join(', ');
      variant([
        'This ' + position + ' role emphasizes ' + m + '. How would you ramp up on ' + missing[0] + ' quickly if you joined us?',
        'I do not see ' + missing[0] + ' clearly on your resume, but this ' + position + ' job needs it. How would you close that gap?',
        'Which of ' + m + ' are you least experienced in, and what is your plan to become productive with it within a month?'
      ], { type: 'gap', level: 'intermediate', domain: domain });
    }

    // 6) Light domain bank only if still short
    if (wantTech && questions.length < num - 2) {
      const need = Math.min(2, num - questions.length - 2);
      const pool = [].concat(bank.intermediate || [], bank.practical || [], bank.basic || []);
      pickFresh(pool, usedQs, need).forEach(function (q) {
        push(q, { type: 'technical', level: 'intermediate', domain: domain });
      });
    }
    if (wantCoding && questions.length < num - 2 && (bank.coding || []).length) {
      pickFresh(bank.coding, usedQs, 1).forEach(function (q) {
        push(q, { type: 'coding', level: 'intermediate', domain: domain });
      });
    }

    // 7) Behavioral + motivation
    if (wantHr && questions.length < num) {
      const behPool = pickFresh([
        'Tell me about a challenging situation at work and how you handled it.',
        'Describe a time you had to meet a tight deadline. What did you prioritize?',
        'Give an example of when you worked with a difficult stakeholder or teammate.',
        'Tell me about a mistake you made and what you learned from it.',
        'Describe a time you received critical feedback. What did you change afterwards?',
        'Tell me about a time you had to learn something new very quickly to finish a task.',
        'Describe a situation where you had to persuade others to accept your idea.',
        'Give an example of when you took initiative without being asked.'
      ].concat(typeof BEHAVIORAL !== 'undefined' ? BEHAVIORAL : []), usedQs, 1);
      if (behPool.length) push(behPool[0], { type: 'behavioral', level: 'intermediate', domain: domain });

      const hrVariants = [
        'Why are you interested in this ' + position + ' role' + companyBit + ', and why should we hire you?',
        'What draws you to this ' + position + ' opportunity, and what unique value would you bring in the first 6 months?',
        'How does this ' + position + ' role fit your career goals over the next 2–3 years?',
        'Where do you see yourself growing if you join us as a ' + position + ', and what do you want to learn first?',
        'What are you looking for in your next role, and how does this ' + position + ' position match it?'
      ];
      const hrFresh = pickFresh(hrVariants, usedQs, 1);
      push(hrFresh[0] || hrVariants[0], { type: 'hr', level: 'basic', domain: domain });
    }

    // 8) Closing
    variant([
      'We are almost at the end. Do you have any questions for me about the ' + position + ' role, the team, or next steps in the process?',
      'Before we wrap up, what questions do you have about the ' + position + ' position, our work culture, or what success looks like here?',
      'That brings us to the end of my questions. Is there anything about the ' + position + ' role or the next steps that you would like to ask me?',
      'Thank you for your answers. Is there anything you would like to add about yourself, or any question you have for me about this role?'
    ], { type: 'closing', level: 'basic', domain: domain });

    // Fill remaining from skill pool / domain bank
    const filler = pickFresh(
      skillPool.concat(bank.basic || [], bank.intermediate || [], bank.practical || []),
      questions.map(function (q) { return q.question; }).concat(usedQs),
      40
    );
    var fi = 0;
    while (questions.length < num && filler.length && fi < filler.length * 2) {
      push(filler[fi % filler.length], { type: 'technical', level: 'intermediate', domain: domain });
      fi++;
    }

    // Closing must stay last, intro first
    const closeIdx = questions.findIndex(function (q) { return q.type === 'closing'; });
    if (closeIdx !== -1 && closeIdx !== questions.length - 1) {
      questions.push(questions.splice(closeIdx, 1)[0]);
    }
    const introIdx = questions.findIndex(function (q) { return q.type === 'intro'; });
    if (introIdx > 0) {
      const intro = questions.splice(introIdx, 1)[0];
      questions.unshift(intro);
    }

    return questions.slice(0, num).map(function (q, i) {
      return Object.assign({}, q, { id: i + 1 });
    });
  }



  const MODEL_ANSWERS = [

    {
      match: /sql join|inner vs left/i,
      answer: 'A JOIN combines rows from tables using a related column. INNER JOIN returns only matching rows in both tables. LEFT JOIN returns all rows from the left table and matches from the right (NULL if no match). Example: orders LEFT JOIN customers to list every order even if customer data is missing.'
    },
    {
      match: /what is sql|why do analysts use/i,
      answer: 'SQL (Structured Query Language) is used to query and manage relational databases. Analysts use it to filter, join, aggregate, and extract data for reports and dashboards. Example: SELECT region, SUM(sales) FROM orders GROUP BY region.'
    },
    {
      match: /pivot table/i,
      answer: 'A pivot table summarizes large data in Excel/Sheets by grouping rows/columns and aggregating values (sum, count, average). Example: sales by region and month without writing formulas for each group. It is ideal for quick exploratory analysis.'
    },
    {
      match: /mean, median, and mode|mean.*median/i,
      answer: 'Mean is the average, median is the middle value when sorted, mode is the most frequent value. Median is more robust when outliers exist (e.g. income data). Choose based on distribution and stakeholder needs.'
    },
    {
      match: /data cleaning/i,
      answer: 'Data cleaning fixes quality issues before analysis: missing values, duplicates, wrong types, inconsistent categories, outliers. Steps often include profiling, standardizing formats, imputing or dropping nulls, and documenting rules so results are reproducible.'
    },
    {
      match: /where and having/i,
      answer: 'WHERE filters rows before aggregation. HAVING filters groups after GROUP BY. Example: WHERE order_date >= \"2024-01-01\" then GROUP BY customer HAVING SUM(amount) > 1000.'
    },
    {
      match: /kpi/i,
      answer: 'A KPI (Key Performance Indicator) is a measurable value that shows progress toward a business goal. Examples: monthly recurring revenue, conversion rate, customer churn, average order value. Good KPIs are clear, timely, and actionable.'
    },

    {
      match: /what is html and why/i,
      answer: 'HTML stands for HyperText Markup Language. It is the standard language used to structure content on the web — headings, paragraphs, links, images, forms, etc. Browsers read HTML to display web pages. Without HTML there is no page structure for CSS or JavaScript to work with.'
    },
    {
      match: /tags and attributes/i,
      answer: 'HTML tags define elements (e.g. <p>, <a>, <img>). Attributes provide extra information on a tag, written inside the opening tag as name="value". Example: <a href="https://example.com">Home</a> — "a" is the tag, href is an attribute that sets the link URL.'
    },
    {
      match: /semantic html/i,
      answer: 'Semantic HTML elements clearly describe their meaning to the browser and to developers. Examples: <header>, <nav>, <main>, <article>, <section>, <aside>, <footer>. They improve accessibility, SEO, and maintainability compared to using only <div> for everything.'
    },
    {
      match: /div.*span|span.*div/i,
      answer: '<div> is a block-level container (starts on a new line, full width). <span> is inline (flows inside text). Use div to group larger layout sections and span to style a small piece of text inside a paragraph.'
    },
    {
      match: /what is css\b/i,
      answer: 'CSS (Cascading Style Sheets) styles HTML — colors, layout, fonts, spacing, responsive design. It separates presentation from structure so the same HTML can look different across devices or themes.'
    },
    {
      match: /box model/i,
      answer: 'The CSS box model describes how every element is sized: content → padding → border → margin. Total width = content width + padding + border (+ margin outside). box-sizing: border-box includes padding and border in the set width, which is preferred for layouts.'
    },
    {
      match: /class and id/i,
      answer: 'id is unique (one per page) and selected with #id. class can be reused on many elements and selected with .class. Prefer classes for styling; use ids for unique targets (e.g. skip links, JS hooks) and avoid overusing ids for CSS.'
    },
    {
      match: /responsive web design/i,
      answer: 'Responsive design makes layouts adapt to screen sizes. Techniques: fluid grids, flexible images, CSS media queries, relative units (%, rem, vw), and mobile-first CSS. Goal: usable UI on mobile, tablet, and desktop without separate sites.'
    },
    {
      match: /bootstrap/i,
      answer: 'Bootstrap is a CSS/JS framework with a responsive grid, prebuilt components (navbar, modal, forms), and utilities. It speeds up consistent UI development. You can customize it or use only the grid/utilities as needed.'
    },
    {
      match: /inline.*internal.*external|external.*css/i,
      answer: 'Inline CSS uses the style attribute on an element. Internal CSS uses a <style> block in the page head. External CSS is a separate .css file linked with <link>. External is best for reuse, caching, and maintainability.'
    },
    {
      match: /var,\s*let,\s*and const|difference between var/i,
      answer: 'var is function-scoped and can be redeclared; it is hoisted with undefined. let is block-scoped, can be reassigned but not redeclared in the same scope. const is block-scoped and cannot be reassigned (object properties can still change). Prefer const by default, let when reassignment is needed; avoid var in modern code.'
    },
    {
      match: /javascript data types|main javascript data types/i,
      answer: 'Primitive types: string, number, boolean, null, undefined, symbol, bigint. Non-primitive: object (includes arrays, functions, dates, plain objects). typeof null is a known quirk ("object"). Knowing types helps avoid bugs in comparisons and APIs.'
    },
    {
      match: /function.*arrow function|arrow function|what is a function/i,
      answer: 'A function is a reusable block of code that can take parameters and return a value. Example: function add(a, b) { return a + b; }. An arrow function is shorter syntax: const add = (a, b) => a + b. Arrow functions do not have their own this (they inherit from the outer scope), so they are common in callbacks but not ideal as object methods that need this.'
    },
    {
      match: /== and ===/i,
      answer: '== compares with type coercion (1 == "1" is true). === compares value and type with no coercion (1 === "1" is false). Always prefer === and !== to avoid unexpected conversions.'
    },
    {
      match: /dom manipulation/i,
      answer: 'The DOM is the browser’s tree of the page. Manipulation means reading/updating nodes with JavaScript — e.g. document.querySelector, createElement, appendChild, textContent, classList. Example: document.getElementById("title").textContent = "Hello".'
    },
    {
      match: /promises|async\/await/i,
      answer: 'A Promise represents a future value (pending, fulfilled, rejected). async/await is syntax over promises: async function load() { const res = await fetch(url); const data = await res.json(); }. Use try/catch for errors. It makes asynchronous code easier to read than chained .then().'
    },
    {
      match: /what is react/i,
      answer: 'React is a JavaScript library for building UIs with reusable components. It uses a Virtual DOM to update the real DOM efficiently. You describe UI as a function of state/props, and React re-renders when data changes.'
    },
    {
      match: /props and state/i,
      answer: 'Props are inputs passed from parent to child (read-only for the child). State is data owned by a component that can change over time (e.g. useState). Changing state triggers a re-render. Data flows down via props; events flow up via callbacks.'
    },
    {
      match: /useState|useEffect|hooks/i,
      answer: 'Hooks let function components use state and side effects. useState returns [value, setValue] for local state. useEffect runs after render for side effects (fetch, subscriptions); return a cleanup function when needed. Dependency array controls when the effect re-runs.'
    },
    {
      match: /virtual dom/i,
      answer: 'The Virtual DOM is a lightweight JS copy of the UI tree. React diffs the new virtual tree with the previous one and applies the minimal set of real DOM updates. This improves performance versus rewriting large parts of the DOM manually.'
    }
  ];

  function getModelAnswer(question) {
    const raw = String(question || '').trim();
    const q = raw.toLowerCase().replace(/\s+/g, ' ');

    for (let i = 0; i < MODEL_ANSWERS.length; i++) {
      if (MODEL_ANSWERS[i].match.test(q)) return MODEL_ANSWERS[i].answer;
    }

    // --- Gap / learn-quickly questions ---
    if (/how would you approach learning|demonstrating|learn .* quickly|skill gap|emphasizes/i.test(q)) {
      const skillMatch = raw.match(/emphasizes?\s+([^.]+?)(?:\.|$)/i)
        || raw.match(/demonstrating\s+([^.?]+)/i)
        || raw.match(/learning\s+(?:or\s+demonstrating\s+)?([^.?]+)/i);
      const skill = (skillMatch && skillMatch[1] ? skillMatch[1] : 'this skill').replace(/\s+/g, ' ').trim();
      return 'For ' + skill + ', I would: (1) learn the basics from official docs or a short course, (2) practice on one real task or public dataset so I can show a concrete example, (3) explain in the interview what I built and what I still plan to improve. Related skills I already have help me ramp up faster.';
    }

    // --- Tell me about yourself / intro ---
    if (/tell me about yourself|introduce yourself|walk me through your (resume|background)/i.test(q)) {
      return 'I would give a 60–90 second intro: present role and years of experience, 1–2 relevant achievements with numbers, skills that match this job, and why I am interested in this role. Keep it achievement-focused, not a full life story.';
    }

    // --- Why this role / company ---
    if (/why (are you interested|do you want)|why should we hire|why this (role|position|company)/i.test(q)) {
      return 'I would connect my background to the job: mention 2–3 requirements I already meet, one gap I am closing, and a clear reason this role fits my goals. End with enthusiasm for the team or product, not only salary.';
    }

    // --- Tableau ---
    if (/tableau/i.test(q)) {
      return 'Tableau is used to build interactive dashboards. A strong answer covers connecting data, choosing charts for the business question, filters and calculated fields, and sharing the dashboard. Example: a sales dashboard that showed region-wise revenue so managers could act weekly.';
    }

    // --- Power BI ---
    if (/power\s*bi/i.test(q)) {
      return 'Power BI is Microsoft’s BI tool for reports and dashboards. I would mention data load, visuals, basic DAX, and publishing. Example: a KPI report for leadership with clear filters and one insight that changed a decision.';
    }

    // --- SQL family ---
    if (/\bsql\b|join|group by|where and having|query/i.test(q)) {
      if (/join|inner|left/i.test(q)) {
        return 'JOINs combine tables on a related column. INNER JOIN keeps only matching rows; LEFT JOIN keeps all rows from the left table and matches from the right (NULL if none). Example: orders LEFT JOIN customers to list every order even if customer data is missing.';
      }
      if (/where and having|having/i.test(q)) {
        return 'WHERE filters rows before aggregation; HAVING filters groups after GROUP BY. Example: WHERE order_date >= "2024-01-01" then GROUP BY customer HAVING SUM(amount) > 1000.';
      }
      return 'SQL is used to query relational data. A good answer states the business question first, then filters (WHERE), grouping (GROUP BY), and joins only when needed. Always check row counts so the numbers make sense.';
    }

    // --- Excel / pivot ---
    if (/excel|pivot|vlookup|xlookup/i.test(q)) {
      return 'In Excel I would clean the data, use pivot tables for summaries, and VLOOKUP/XLOOKUP to combine sheets. Example: monthly sales by region in a pivot, with one chart for stakeholders. I would also mention data validation to avoid errors.';
    }

    // --- Statistics ---
    if (/mean|median|mode|correlation|statistics|kpi/i.test(q)) {
      if (/kpi/i.test(q)) {
        return 'A KPI is a measurable value tied to a business goal (e.g. conversion rate, churn, revenue). Good KPIs are clear, timely, and actionable. I would pick 3–5 KPIs for the role and explain how I would track them.';
      }
      return 'Mean is the average, median is the middle value, mode is the most frequent. Median is better when outliers exist. Correlation means two measures move together — it does not prove cause. I always link the number to a decision.';
    }

    // --- Data cleaning / analysis process ---
    if (/data cleaning|messy|missing values|duplicate/i.test(q)) {
      return 'I profile the data first (nulls, duplicates, types), then clean: fix formats, handle missing values, remove or flag duplicates, and document rules. Example: standardizing city names and dropping empty revenue rows before building a dashboard.';
    }

    // --- Behavioral / STAR ---
    if (/tell me about a time|describe a (situation|conflict|challenge)|give an example of|how did you handle/i.test(q)) {
      return 'Use STAR: Situation (context), Task (my responsibility), Action (what I did), Result (outcome with a number if possible). Keep it under 2 minutes and relevant to this job. Example structure: “In my last role… I was asked to… I did X and Y… which improved Z by N%.”';
    }

    // --- Closing ---
    if (/any questions for (me|us)|do you have (any )?questions/i.test(q)) {
      return 'Ask 1–2 thoughtful questions: team priorities for the first 90 days, how success is measured in this role, or what the biggest challenge is right now. Avoid only asking about salary or leave in the first interview.';
    }

    // --- HTML / CSS / JS / React (keep existing quality) ---
    if (/what is html|html and why/i.test(q)) {
      return 'HTML structures web content (text, links, images, forms). Browsers turn it into the page. CSS styles it; JavaScript adds behavior. Without clear HTML structure, styling and accessibility suffer.';
    }
    if (/semantic html/i.test(q)) {
      return 'Semantic tags describe meaning: header, nav, main, article, section, footer. They help accessibility, SEO, and maintainability versus using only divs.';
    }
    if (/box model/i.test(q)) {
      return 'Content + padding + border + margin. With box-sizing: border-box, padding and border are included in width/height, which makes layouts easier.';
    }
    if (/\bvar\b.*\blet\b|\blet\b.*\bconst\b/i.test(q)) {
      return 'var is function-scoped; let and const are block-scoped. Prefer const by default, let when you need reassignment; avoid var in modern code.';
    }
    if (/== and ===|===/i.test(q)) {
      return '== allows type coercion; === checks value and type. Prefer === and !== to avoid surprises.';
    }
    if (/promise|async\/await/i.test(q)) {
      return 'A Promise is a future value (pending, fulfilled, rejected). async/await makes asynchronous code easier to read; use try/catch for errors.';
    }
    if (/what is react|react and what problem/i.test(q)) {
      return 'React is a library for building UIs with components. It uses a Virtual DOM and updates the UI when state or props change.';
    }
    if (/props and state/i.test(q)) {
      return 'Props are inputs from parent to child (read-only for the child). State is data the component owns and can change; updating state re-renders the UI.';
    }
    if (/usestate|useeffect|hooks/i.test(q)) {
      return 'Hooks let function components use state and side effects. useState holds local state; useEffect runs after render for data fetching or subscriptions, with a dependency array.';
    }

    // --- REST / API ---
    if (/rest api|what is (an )?api|http methods|get.*post/i.test(q)) {
      return 'A REST API exposes resources over HTTP. Common methods: GET (read), POST (create), PUT/PATCH (update), DELETE (remove). I would mention status codes and JSON as the usual format.';
    }

    // --- Generic but ALWAYS tied to THIS question ---
    // Extract a short topic phrase from the question
    let topic = raw
      .replace(/^(hello|hi)[^.]*\.\s*/i, '')
      .replace(/^(what is|what are|explain|describe|how (do|would|can) you|how does|tell me about|walk me through)\s+/i, '')
      .replace(/\?.*$/, '')
      .trim();
    if (topic.length > 90) topic = topic.slice(0, 90) + '…';
    if (topic.length < 8) topic = 'this topic';

    if (/^what is|^what are|^explain|^define/i.test(q)) {
      return 'For "' + topic + '": (1) give a one-sentence definition in plain language, (2) add one short real example from study or work, (3) say when you would use it in this job. Keep it under a minute.';
    }
    if (/^how (do|would|can)/i.test(q)) {
      return 'For "' + topic + '": describe steps in order — prepare, do the main action, check the result. Mention one tool or method you would use and one mistake to avoid.';
    }
    if (/difference between|vs\.?/i.test(q)) {
      return 'Compare both sides clearly: what each is, one key difference, and when you would choose each. Example from real work helps the interviewer trust your answer.';
    }

    return 'A strong answer on "' + topic + '": start with a clear point, support it with one example from your experience, and link it to this job. Stay structured and under about one minute.';
  }

  window.InterviewQuestions = { buildInterviewQuestions,
    resetQuestionSeed, detectDomain, getModelAnswer,
    markQuestionsUsed, getUsedQuestionsForJob, usedIndex, pickFresh };
})();

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
        'How do you find the largest number in an array?',
        'How do you remove duplicate values from an array?',
        'How would you check if a string is a palindrome?',
        'Describe how you would build a counter with increment/decrement in JavaScript or React.',
        'How would you build a responsive navigation bar?',
        'How would you create a login form with client-side validation?',
        'How would you fetch users from an API and display them in a list?',
        'How would you implement search/filter on a list of items?',
        'How would you create a modal popup with HTML, CSS, and JavaScript?'
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
        'Write logic to validate an email on the server.',
        'How would you implement a simple in-memory cache with TTL?'
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

  function take(arr, n, start = 0) {
    if (!arr || !arr.length) return [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[(start + i) % arr.length]);
    return out;
  }

  function buildInterviewQuestions({ resume, job, setup }) {
    const num = Math.min(20, Math.max(5, Number(setup?.numQuestions) || 10));
    const type = (setup?.type || 'Technical + HR').toLowerCase();
    const difficulty = (setup?.difficulty || 'Medium').toLowerCase();
    const position = setup?.position || job?.position || job?.title || 'this role';
    const name = (resume?.name || 'there').split(/\s+/)[0];
    const domain = detectDomain(position, job, resume, setup);
    const bank = BANKS[domain] || BANKS.general;
    const { exp0, skills } = resumeBits(resume || {});

    const wantTech = /technical|coding|system|full\s*stack|frontend|backend/i.test(type) || type.includes('technical');
    const wantHr = /hr|behavioral|\+/.test(type) || type.includes('hr');
    const wantCoding = /coding|technical/i.test(type) || domain === 'frontend' || domain === 'fullstack' || domain === 'backend';

    const questions = [];
    let id = 1;
    const push = (q, meta) => {
      if (questions.length >= num) return;
      questions.push({ id: id++, ...meta, question: q });
    };

    // Intro tied to TARGET ROLE (not only resume career)
    push(
      `Hello ${name}. Welcome to your mock interview for the ${position} position. Please introduce yourself and highlight experience relevant to this role.`,
      { type: 'intro', level: 'basic', domain }
    );

    // Optional resume bridge if experience exists
    if (exp0 && questions.length < num) {
      push(
        `I see on your resume you worked as ${exp0.role}${exp0.company ? ' at ' + exp0.company : ''}${exp0.duration ? ' (' + exp0.duration + ')' : ''}. How does that experience prepare you for a ${position} role?`,
        { type: 'resume', level: 'basic', domain }
      );
    }

    // Build pool by difficulty
    let basicN, midN, advN, pracN, codeN;
    if (difficulty === 'easy') {
      basicN = 4; midN = 2; advN = 1; pracN = 1; codeN = 1;
    } else if (difficulty === 'hard') {
      basicN = 1; midN = 2; advN = 3; pracN = 2; codeN = 2;
    } else {
      basicN = 3; midN = 3; advN = 2; pracN = 2; codeN = 2;
    }

    if (wantTech) {
      take(bank.basic, basicN).forEach(q => push(q, { type: 'technical', level: 'basic', domain }));
      take(bank.intermediate, midN, 1).forEach(q => push(q, { type: 'technical', level: 'intermediate', domain }));
      take(bank.advanced, advN, 2).forEach(q => push(q, { type: 'technical', level: 'advanced', domain }));
      take(bank.practical || [], pracN).forEach(q => push(q, { type: 'scenario', level: 'advanced', domain }));
      if (wantCoding) {
        take(bank.coding || [], codeN).forEach(q => push(q, { type: 'coding', level: 'intermediate', domain }));
      }
    }

    // Job skill gap (from JD)
    const jobSkills = (job?.skills || []).map(String);
    if (jobSkills.length && questions.length < num - 1) {
      const missing = jobSkills.filter(js =>
        !skills.some(s => s.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(s.toLowerCase()))
      );
      if (missing.length) {
        push(
          `This ${position} role emphasizes ${missing.slice(0, 3).join(', ')}. How would you approach learning or demonstrating ${missing[0]} quickly?`,
          { type: 'gap', level: 'intermediate', domain }
        );
      } else {
        push(
          `The job description highlights ${jobSkills.slice(0, 3).join(', ')}. Tell me about a project where you used one of these.`,
          { type: 'job', level: 'intermediate', domain }
        );
      }
    }

    if (wantHr) {
      push(BEHAVIORAL[Math.floor(Math.random() * BEHAVIORAL.length)], { type: 'behavioral', level: 'intermediate', domain });
      push(
        `Why are you interested in the ${position} role, and why should we hire you?`,
        { type: 'hr', level: 'basic', domain }
      );
    }

    push('Do you have any questions for me about the role, the team, or next steps?', {
      type: 'closing',
      level: 'basic',
      domain
    });

    // If still short, fill from domain bank
    const filler = [].concat(bank.basic, bank.intermediate, bank.advanced, bank.practical || []);
    let fi = 0;
    while (questions.length < num && filler.length) {
      push(filler[fi % filler.length], { type: 'technical', level: 'intermediate', domain });
      fi++;
    }

    return questions.slice(0, num);
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
    const q = String(question || '').toLowerCase().replace(/\s+/g, ' ').trim();
    for (let i = 0; i < MODEL_ANSWERS.length; i++) {
      if (MODEL_ANSWERS[i].match.test(q)) return MODEL_ANSWERS[i].answer;
    }
    // Keyword fallbacks (order matters — more specific first)
    if (/arrow\s*function|what is a function/i.test(q)) {
      return 'A function is a reusable block of code that can take parameters and return a value. Example: function add(a, b) { return a + b; }. An arrow function is shorter syntax: const add = (a, b) => a + b. Arrow functions do not have their own "this" (they inherit outer scope), so they are great for callbacks but not ideal as object methods that rely on this.';
    }
    if (/\bvar\b.*\blet\b.*\bconst\b|\blet\b.*\bconst\b/i.test(q)) {
      return 'var is function-scoped and can be redeclared; it is hoisted as undefined. let is block-scoped and can be reassigned but not redeclared in the same scope. const is block-scoped and cannot be reassigned (object contents can still change). Prefer const by default, let when you need reassignment; avoid var in modern JavaScript.';
    }
    if (/semantic/i.test(q)) {
      return 'Semantic HTML elements describe meaning, not just layout. Examples: <header>, <nav>, <main>, <article>, <section>, <aside>, <footer>. They help accessibility (screen readers), SEO, and clearer code versus using only <div>.';
    }
    if (/data types/i.test(q)) {
      return 'JavaScript types include primitives: string, number, boolean, null, undefined, symbol, bigint; and object (arrays, functions, dates, plain objects). Knowing types helps you avoid bugs with == vs === and API data handling.';
    }
    if (/html and why|what is html/i.test(q)) {
      return 'HTML (HyperText Markup Language) structures web content — text, links, images, forms. Browsers parse HTML into the DOM. CSS styles it and JavaScript makes it interactive.';
    }
    if (/tags and attributes/i.test(q)) {
      return 'Tags define elements (e.g. <p>, <a>). Attributes add information on a tag, like href on a link: <a href="https://example.com">Home</a>. The tag is "a"; href is the attribute.';
    }
    if (/box model/i.test(q)) {
      return 'The CSS box model is content + padding + border + margin. Total size depends on box-sizing. With border-box, padding and border are included in width/height, which makes layouts easier.';
    }
    if (/== and ===|===/i.test(q)) {
      return '== allows type coercion (1 == "1" is true). === checks value and type with no coercion (1 === "1" is false). Prefer === and !== in real projects.';
    }
    if (/promise|async/i.test(q)) {
      return 'A Promise represents a value that will be available later (pending, fulfilled, rejected). async/await is cleaner syntax over promises: const data = await fetch(url).then(r => r.json()); Use try/catch to handle errors.';
    }
    if (/\breact\b/i.test(q) && /what is react/i.test(q)) {
      return 'React is a JavaScript library for building user interfaces with components. It uses a Virtual DOM and updates the UI when state or props change, so you describe UI as a function of data.';
    }
    if (/props and state/i.test(q)) {
      return 'Props are read-only inputs from parent to child. State is data owned by a component that can change (e.g. useState). Updating state re-renders the component. Data flows down via props; events flow up via callbacks.';
    }
    // Generic but still useful — never the vague "explain the concept" only
    return 'For this question, a strong answer should: (1) define the term in plain language, (2) show a short code or real example, (3) state one practical benefit or caveat. Question was: "' + String(question || '').slice(0, 120) + '"';
  }


  window.InterviewQuestions = { buildInterviewQuestions, detectDomain, getModelAnswer };
})();

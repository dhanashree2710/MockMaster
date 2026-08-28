/**
 * MockMaster resume parser — section-aware extraction for PDF/DOCX
 */
(function () {
  const TECH_SKILLS = [
    'JavaScript','TypeScript','Python','Java','C++','C#','C','PHP','Ruby','Swift','Kotlin','Go','Rust',
    'React','Angular','Vue','Next.js','Node.js','Express','Django','Flask','Spring','Laravel','Flutter',
    'HTML','CSS','SASS','SCSS','Tailwind','Bootstrap','SQL','MySQL','PostgreSQL','MongoDB','Firebase','Redis',
    'AWS','Azure','GCP','Docker','Kubernetes','Git','GitHub','CI/CD','Jenkins','Linux',
    'REST','GraphQL','API','Microservices','Agile','Scrum','Jira','Figma','Postman',
    'Excel','Advanced Excel','Power BI','Tableau','Data Analytics','Data Analysis','Machine Learning',
    'IoT','Android','CRM','Salesforce','SAP','WordPress','Selenium','Jest'
  ];

  const SOFT_SKILLS = [
    'Communication','Leadership','Teamwork','Problem Solving','Time Management','Collaboration',
    'Mentoring','Presentation','Facilitation','Training','Coordination'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('load fail ' + src));
      document.head.appendChild(s);
    });
  }

  async function extractTextFromPDF(file) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    const parts = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let lastY = null;
      let line = '';
      content.items.forEach((it) => {
        const y = it.transform ? it.transform[5] : 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (line.trim()) parts.push(line.trim());
          line = '';
        }
        line += (it.str || '') + ' ';
        lastY = y;
      });
      if (line.trim()) parts.push(line.trim());
      parts.push('');
    }
    return parts.join('\n');
  }

  async function extractTextFromDOCX(file) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value || '';
  }

  async function extractText(file) {
    const name = (file.name || '').toLowerCase();
    try {
      if (name.endsWith('.pdf')) return await extractTextFromPDF(file);
      if (name.endsWith('.docx')) return await extractTextFromDOCX(file);
      if (name.endsWith('.txt') || name.endsWith('.md')) return await file.text();
      try { return await file.text(); } catch { return ''; }
    } catch (err) {
      console.warn('[ResumeParser]', err);
      return '';
    }
  }

  function normalize(text) {
    return (text || '')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function linesOf(text) {
    return normalize(text).split('\n').map(l => l.trim()).filter(Boolean);
  }

  const SECTION_HEADERS = [
    ['summary', /^(professional\s+summary|summary|profile|objective|about\s+me)\b/i],
    ['competencies', /^(core\s+competencies|competencies|key\s+skills|skills|technical\s+skills|core\s+skills)\b/i],
    ['experience', /^(professional\s+experience|work\s+experience|experience|employment|work\s+history)\b/i],
    ['education', /^(education|academic|qualifications|degrees)\b/i],
    ['projects', /^(projects|personal\s+projects|key\s+projects|portfolio)\b/i],
    ['certifications', /^(certifications|certificates|licenses)\b/i]
  ];

  function splitSections(text) {
    const lines = linesOf(text);
    const sections = { header: [], summary: [], competencies: [], experience: [], education: [], projects: [], certifications: [], other: [] };
    let current = 'header';
    for (const line of lines) {
      let matched = false;
      for (const [key, re] of SECTION_HEADERS) {
        if (re.test(line) && line.length < 60) {
          current = key;
          matched = true;
          break;
        }
      }
      if (!matched) sections[current].push(line);
    }
    return sections;
  }

  function findEmail(text) {
    const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return m ? m[0] : '';
  }

  function findPhone(text) {
    const m = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}|\b\d{10}\b/);
    return m ? m[0].replace(/\s+/g, '') : '';
  }

  function findName(sections, text, fileName) {
    const header = sections.header.join('\n') + '\n' + linesOf(text).slice(0, 8).join('\n');
    const candidates = linesOf(header);
    for (const line of candidates) {
      if (line.length < 3 || line.length > 55) continue;
      if (/@|http|www\.|\d{5,}|pune|mumbai|delhi|india|maharashtra/i.test(line)) continue;
      if (/trainer|developer|engineer|manager|executive|professional|summary|experience/i.test(line) && line.split(/\s+/).length > 5) continue;
      if (/^[A-Za-z][A-Za-z.\s'-]{2,50}$/.test(line) && line.split(/\s+/).length <= 5) {
        return line.replace(/\s+/g, ' ').trim().toUpperCase() === line.toUpperCase()
          ? line.replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, ' ')
          : line;
      }
    }
    // Title line often has name in ALL CAPS at very top
    for (const line of candidates.slice(0, 3)) {
      if (/^[A-Z][A-Z\s.'-]{5,50}$/.test(line) && !/TRAINER|DEVELOPER|PROFESSIONAL|SUMMARY/.test(line)) {
        return line.replace(/\b\w+/g, w => w.charAt(0) + w.slice(1).toLowerCase());
      }
    }
    const base = (fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
      .replace(/\b(resume|cv)\b/gi, '').trim();
    return base ? base.replace(/\b\w/g, c => c.toUpperCase()) : 'Candidate';
  }

  function findHeadline(sections, text) {
    const header = sections.header.concat(linesOf(text).slice(0, 12));
    for (const line of header) {
      if (/trainer|developer|engineer|executive|manager|analyst|consultant|designer/i.test(line) &&
          line.length < 100 && !/@/.test(line)) {
        return line.replace(/\|/g, '·').replace(/\s+/g, ' ').trim();
      }
    }
    return '';
  }

  function findLocation(text) {
    const cities = ['Pune','Bengaluru','Bangalore','Mumbai','Delhi','Hyderabad','Chennai','Kolkata','Noida','Gurugram','Gurgaon','Ahmedabad','Nagpur','Remote'];
    for (const c of cities) {
      if (new RegExp('\\b' + c + '\\b', 'i').test(text)) {
        if (/Maharashtra|India/i.test(text) && c === 'Pune') return 'Pune, Maharashtra, India';
        return c;
      }
    }
    const m = text.match(/\b([A-Z][a-z]+),\s*(Maharashtra|Karnataka|India)\b/);
    return m ? m[0] : '';
  }

  function findSkills(sections, text) {
    const technical = [];
    const soft = [];
    const pool = (sections.competencies.join(' ') + ' ' + sections.summary.join(' ') + ' ' + text).toLowerCase();

    TECH_SKILLS.forEach(s => {
      const re = new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\b', 'i');
      if (re.test(pool) && !technical.includes(s)) technical.push(s);
    });
    SOFT_SKILLS.forEach(s => {
      const re = new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(pool) && !soft.includes(s)) soft.push(s);
    });

    // Competency bullet lines that are multi-word phrases
    sections.competencies.forEach(line => {
      const cleaned = line.replace(/^[●•\-\*\d.]+\s*/, '').trim();
      if (cleaned.length > 3 && cleaned.length < 55 && !/@|\d{4}/.test(cleaned)) {
        const isTech = TECH_SKILLS.some(t => cleaned.toLowerCase().includes(t.toLowerCase()));
        if (isTech) {
          // keep as-is only if short skill-like
          if (cleaned.split(/\s+/).length <= 5 && !technical.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
            // prefer dictionary match already done
          }
        } else if (/training|facilitation|development|coordination|curriculum|workshop|mentoring|communication|leadership/i.test(cleaned)) {
          if (!soft.some(s => s.toLowerCase() === cleaned.toLowerCase()) && cleaned.split(/\s+/).length <= 6) {
            soft.push(cleaned);
          }
        }
      }
    });

    return { technical, soft };
  }

  function findExperienceYears(text, sections) {
    const m = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience)?/i);
    if (m) return parseInt(m[1], 10);
    // Infer from date ranges
    const years = [];
    const re = /\b(20\d{2})\b/g;
    let x;
    const blob = sections.experience.join(' ');
    while ((x = re.exec(blob))) years.push(parseInt(x[1], 10));
    if (years.length >= 2) return Math.max(1, Math.max(...years) - Math.min(...years));
    return 0;
  }

  function parseExperience(sections) {
    const lines = sections.experience;
    const jobs = [];
    let current = null;

    const roleRe = /^(.+?)\s*[|–—-]\s*(.+?)(?:\s*[|–—-]\s*(.+))?$/;
    const dateRe = /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*[–—\-to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present|Current)/i;

    for (const raw of lines) {
      const line = raw.replace(/^[●•\-\*]+\s*/, '').trim();
      if (!line) continue;

      const dateMatch = line.match(dateRe);
      // Role | Company
      if (/trainer|executive|developer|engineer|manager|analyst|intern|consultant|officer/i.test(line) &&
          (line.includes('|') || line.includes('–') || line.includes('-')) &&
          line.length < 120 && !/^[●•]/.test(raw)) {
        if (current) jobs.push(current);
        const parts = line.split(/\s*[|–—]\s*/).map(p => p.trim());
        current = {
          role: parts[0] || line,
          company: parts[1] || '',
          duration: '',
          location: parts[2] || '',
          responsibilities: []
        };
        continue;
      }

      if (dateMatch) {
        if (!current) current = { role: 'Role', company: '', duration: '', responsibilities: [] };
        current.duration = dateMatch[1] + ' – ' + dateMatch[2];
        if (/Pune|Mumbai|Remote|Delhi|Bengaluru/i.test(line)) {
          const loc = line.match(/\b(Pune|Mumbai|Remote|Delhi|Bengaluru)\b/i);
          if (loc) current.location = loc[1];
        }
        continue;
      }

      if (current && line.length > 15) {
        current.responsibilities.push(line);
      }
    }
    if (current) jobs.push(current);
    return jobs;
  }

  function parseEducation(sections) {
    const edu = [];
    const lines = sections.education;
    const degreeRe = /(B\.?\s?Tech|B\.?\s?E\.?|M\.?\s?Tech|M\.?\s?S\.?|MBA|B\.?\s?Sc|M\.?\s?Sc|B\.?\s?A\.?|M\.?\s?A\.?|Bachelor|Master|Ph\.?\s?D|Diploma|HSC|SSC|12th|10th)[^,\n]{0,60}/i;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(degreeRe);
      if (m) {
        const degree = m[0].trim();
        let university = '';
        let year = '';
        const yearM = line.match(/\b(19|20)\d{2}\b/);
        if (yearM) year = yearM[0];
        // next line often university
        if (lines[i + 1] && !degreeRe.test(lines[i + 1]) && lines[i + 1].length < 80) {
          university = lines[i + 1].replace(/^[●•\-\*]+\s*/, '');
          const y2 = university.match(/\b(19|20)\d{2}\b/);
          if (y2) { year = year || y2[0]; university = university.replace(/\b(19|20)\d{2}\b/, '').trim(); }
        }
        edu.push({ degree, university, year });
      }
    }
    // If education section empty but summary has ms./expert noise - ignore garbage
    return edu.filter(e => e.degree.length > 2 && !/^ms\.?\s*$/i.test(e.degree));
  }

  function parseProjects(sections) {
    const projects = [];
    const lines = sections.projects;
    let current = null;
    for (const raw of lines) {
      const line = raw.replace(/^[●•\-\*\d.]+\s*/, '').trim();
      if (!line) continue;
      if (line.length < 60 && !/^[a-z]/.test(line) && line.split(/\s+/).length <= 8) {
        if (current) projects.push(current);
        current = { name: line, tech: [], description: '' };
      } else if (current) {
        current.description = (current.description + ' ' + line).trim().slice(0, 300);
      }
    }
    if (current) projects.push(current);
    return projects;
  }

  function parseResumeText(rawText, fileName) {
    const text = normalize(rawText);
    const sections = splitSections(text);
    const skills = findSkills(sections, text);
    const years = findExperienceYears(text, sections);
    const headline = findHeadline(sections, text);
    const experience = parseExperience(sections);
    const education = parseEducation(sections);
    const projects = parseProjects(sections);
    const name = findName(sections, text, fileName);
    const email = findEmail(text);
    const phone = findPhone(text);
    const location = findLocation(text);

    // Professional role from headline (not random skill)
    let currentRole = headline;
    if (!currentRole && experience[0]) {
      currentRole = experience[0].role + (experience[0].company ? ' · ' + experience[0].company : '');
    }
    if (!currentRole) currentRole = 'Professional';

    return {
      name: name || 'Candidate',
      email,
      phone,
      location,
      currentRole,
      headline,
      experienceYears: years,
      careerLevel: years >= 5 ? 'Senior' : years >= 2 ? 'Mid-level' : years > 0 ? 'Junior' : 'Entry-level',
      industries: [],
      summary: sections.summary.join(' ').slice(0, 600),
      skills: {
        technical: skills.technical,
        soft: skills.soft,
        tools: skills.technical.filter(s => /Excel|Git|Jira|Figma|CRM|Power BI/i.test(s)),
        frameworks: skills.technical.filter(s => /React|Flutter|Angular|Django|Spring/i.test(s)),
        languages: skills.technical.filter(s => /JavaScript|Python|Java|PHP|C\+\+|TypeScript|^C$/i.test(s))
      },
      education,
      experience,
      projects,
      competencies: sections.competencies.map(l => l.replace(/^[●•\-\*]+/, '').trim()).filter(l => l.length > 2 && l.length < 80),
      extractedFromFile: true,
      fileName: fileName || '',
      rawTextPreview: text.slice(0, 2000),
      rawTextLength: text.length
    };
  }

  async function parseResumeFile(file) {
    const rawText = await extractText(file);
    console.info('[ResumeParser] chars:', (rawText || '').length);
    if (!rawText || rawText.trim().length < 40) {
      return {
        name: (file.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
        email: '', phone: '', location: '',
        currentRole: '', experienceYears: 0, careerLevel: 'Entry-level',
        skills: { technical: [], soft: [], tools: [], frameworks: [], languages: [] },
        education: [], experience: [], projects: [], competencies: [],
        extractedFromFile: false,
        extractionNote: 'Could not read text. Prefer a text-based PDF (not scanned) or DOCX.',
        fileName: file.name,
        rawTextLength: 0
      };
    }
    return parseResumeText(rawText, file.name);
  }

  window.ResumeParser = { extractText, parseResumeText, parseResumeFile };
})();

/**
 * MockMaster — App Configuration & Mock Data
 * Ready for backend API integration later.
 */

const APP_CONFIG = {
  // Supabase (custom users table — set keys in assets/js/supabase-client.js)
  supabaseUrl: null,
  supabaseAnonKey: null,
  name: 'MockMaster',
  tagline: 'Your Resume. Your Role. Your AI Interview Coach.',
  version: '1.0.0',
  // When backend is ready, set this to your API base URL
  apiBase: null, // e.g. 'https://api.interviewpro.ai/v1'
  supportedResumeFormats: ['.pdf', '.doc', '.docx'],
  maxResumeSizeMB: 5,
  interviewLanguages: [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
    { code: 'mr', label: 'Marathi', flag: '🇮🇳' },
    { code: 'ta', label: 'Tamil', flag: '🇮🇳' },
    { code: 'te', label: 'Telugu', flag: '🇮🇳' },
    { code: 'bn', label: 'Bengali', flag: '🇮🇳' },
    { code: 'gu', label: 'Gujarati', flag: '🇮🇳' },
    { code: 'kn', label: 'Kannada', flag: '🇮🇳' },
    { code: 'pa', label: 'Punjabi', flag: '🇮🇳' },
    { code: 'ur', label: 'Urdu', flag: '🇮🇳' }
  ],
  interviewerStyles: ['Professional', 'Friendly', 'Strict', 'Technical'],
  difficulties: ['Easy', 'Medium', 'Hard'],
  interviewTypes: ['Technical', 'HR / Behavioral', 'Technical + HR', 'System Design']
};

// ---- Mock Candidate (used until real AI/backend is connected) ----
const MOCK_RESUME = {
  name: 'John Doe',
  email: 'john.doe@email.com',
  phone: '+91 98765 43210',
  location: 'Bengaluru, India',
  currentRole: 'Frontend Developer',
  experienceYears: 3,
  careerLevel: 'Mid-level',
  industries: ['E-commerce', 'SaaS'],
  skills: {
    technical: ['JavaScript', 'React', 'HTML', 'CSS', 'SQL', 'Git', 'REST APIs', 'Node.js'],
    soft: ['Communication', 'Problem Solving', 'Teamwork', 'Time Management'],
    tools: ['VS Code', 'Figma', 'Jira', 'Postman'],
    frameworks: ['React', 'Express', 'Bootstrap'],
    languages: ['English', 'Hindi']
  },
  education: [
    { degree: 'B.Tech Computer Science', university: 'VTU', year: '2021' }
  ],
  experience: [
    {
      company: 'TechCorp Solutions',
      role: 'Frontend Developer',
      duration: '2022 – Present',
      responsibilities: [
        'Built responsive React applications for e-commerce platform',
        'Improved page load performance by 40%',
        'Collaborated with design and backend teams'
      ],
      achievements: ['Reduced bounce rate by 25%', 'Led migration to React 18']
    },
    {
      company: 'StartupXYZ',
      role: 'Junior Web Developer',
      duration: '2021 – 2022',
      responsibilities: [
        'Developed landing pages and marketing sites',
        'Maintained legacy jQuery codebase'
      ],
      achievements: []
    }
  ],
  projects: [
    {
      name: 'E-commerce Dashboard',
      tech: ['React', 'Node.js', 'MongoDB'],
      description: 'Admin dashboard for managing products, orders and analytics.',
      role: 'Full-stack (frontend heavy)'
    },
    {
      name: 'Task Manager App',
      tech: ['React', 'Firebase'],
      description: 'Real-time collaborative task management tool.',
      role: 'Frontend lead'
    }
  ]
};

const MOCK_JOB = {
  position: 'Senior Frontend Developer',
  experience: '3–5 years',
  requiredSkills: ['JavaScript', 'React', 'TypeScript', 'CSS', 'Git', 'REST APIs'],
  preferredSkills: ['Next.js', 'AWS', 'Docker', 'GraphQL', 'Testing'],
  responsibilities: [
    'Build and maintain high-quality React applications',
    'Collaborate with product and design teams',
    'Mentor junior developers',
    'Improve performance and accessibility'
  ],
  softSkills: ['Communication', 'Leadership', 'Problem Solving']
};

const MOCK_MATCH = {
  score: 78,
  matched: ['JavaScript', 'React', 'CSS', 'Git', 'REST APIs', 'Communication', 'Problem Solving'],
  missing: ['TypeScript', 'Next.js', 'AWS', 'Docker', 'GraphQL'],
  partial: ['Node.js', 'Testing']
};

// Sample interview questions (resume + job aware)
const MOCK_QUESTIONS = [
  {
    id: 1,
    type: 'intro',
    question: 'Hello John. Welcome to your mock interview for the Senior Frontend Developer position. Please tell me about yourself and your experience with JavaScript and React.'
  },
  {
    id: 2,
    type: 'resume',
    question: 'I noticed from your resume that you worked on an E-commerce Dashboard project. Can you walk me through your role and the biggest technical challenge you faced?'
  },
  {
    id: 3,
    type: 'technical',
    question: 'What is the difference between controlled and uncontrolled components in React? When would you use each?'
  },
  {
    id: 4,
    type: 'technical',
    question: 'How would you optimize the performance of a React application that is rendering a large list of items?'
  },
  {
    id: 5,
    type: 'job',
    question: 'This role requires mentoring junior developers. How have you approached knowledge sharing or mentoring in your previous teams?'
  },
  {
    id: 6,
    type: 'scenario',
    question: 'Imagine a production issue where users report that the product page is loading very slowly. How would you debug and resolve this?'
  },
  {
    id: 7,
    type: 'behavioral',
    question: 'Tell me about a time you had a disagreement with a teammate or designer about a technical decision. How did you handle it?'
  },
  {
    id: 8,
    type: 'gap',
    question: 'Your resume shows strong React experience, but TypeScript is required for this role. How would you approach learning and applying TypeScript in a production codebase?'
  },
  {
    id: 9,
    type: 'hr',
    question: 'Why are you interested in this Senior Frontend Developer role, and why should we hire you?'
  },
  {
    id: 10,
    type: 'closing',
    question: 'Do you have any questions for me about the role or the team?'
  }
];

// Storage keys
const STORAGE_KEYS = {
  theme: 'ipa_theme',
  language: 'ipa_lang',
  user: 'ipa_user',
  resume: 'ipa_resume',
  job: 'ipa_job',
  match: 'ipa_match',
  sessions: 'ipa_sessions',
  progress: 'ipa_progress'
};

// Helpers to simulate async AI calls
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.APP_CONFIG = APP_CONFIG;
window.MOCK_RESUME = MOCK_RESUME;
window.MOCK_JOB = MOCK_JOB;
window.MOCK_MATCH = MOCK_MATCH;
window.MOCK_QUESTIONS = MOCK_QUESTIONS;
window.STORAGE_KEYS = STORAGE_KEYS;
window.delay = delay;

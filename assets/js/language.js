// Multilingual support
const TRANSLATIONS = {
  en: {
    // Nav
    nav_dashboard: 'Dashboard',
    nav_practice: 'Practice',
    nav_ai_interview: 'AI Interview',
    nav_question_bank: 'Question Bank',
    nav_mock_tests: 'Mock Tests',
    nav_progress: 'Progress',
    nav_achievements: 'Achievements',
    nav_resources: 'Resources',
    nav_profile: 'Profile',
    nav_settings: 'Settings',
    nav_home: 'Home',
    nav_features: 'Features',
    nav_pricing: 'Pricing',
    nav_about: 'About',
    nav_login: 'Login',
    nav_get_started: 'Get Started',
    // Common
    start_practicing: 'Start Practicing',
    explore_features: 'Explore Features',
    start_interview: 'Start Interview',
    continue: 'Continue',
    submit: 'Submit',
    skip: 'Skip',
    next: 'Next',
    previous: 'Previous',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    // Dashboard
    good_afternoon: 'Good afternoon',
    ready_improve: 'Ready to improve your interview skills?',
    questions_practiced: 'Questions Practiced',
    interviews_completed: 'Interviews Completed',
    average_score: 'Average Score',
    current_streak: 'Current Streak',
    skills_improved: 'Skills Improved',
    continue_practice: 'Continue Practice',
    recommended: 'Recommended For You',
    weekly_progress: 'Weekly Progress',
    your_skills: 'Your Skills',
    achievements: 'Achievements',
    // Practice
    practice_title: 'Technical Interview Practice',
    question: 'Question',
    difficulty: 'Difficulty',
    category: 'Category',
    your_answer: 'Your Answer',
    // AI Interview
    ai_interview_title: 'AI Mock Interview',
    listening: 'Listening...',
    speaking: 'Speaking...',
    ready: 'Ready',
    end_interview: 'End Interview',
    pause: 'Pause',
    // Landing
    hero_title: 'Prepare Smarter. Interview Better. Get Hired.',
    hero_desc: 'Practice technical, HR and behavioral interviews with a modern AI-powered preparation experience designed for students and job seekers.',
    try_ai: 'Try AI Interview',
    // Empty
    no_interviews: 'No interviews completed yet.',
    start_first: 'Start your first AI interview',
    // Theme
    light: 'Light',
    dark: 'Dark',
    system: 'System'
  },
  hi: {
    nav_dashboard: 'डैशबोर्ड',
    nav_practice: 'अभ्यास',
    nav_ai_interview: 'एआई इंटरव्यू',
    nav_question_bank: 'प्रश्न बैंक',
    nav_mock_tests: 'मॉक टेस्ट',
    nav_progress: 'प्रगति',
    nav_achievements: 'उपलब्धियाँ',
    nav_resources: 'संसाधन',
    nav_profile: 'प्रोफ़ाइल',
    nav_settings: 'सेटिंग्स',
    nav_home: 'होम',
    nav_features: 'विशेषताएँ',
    nav_pricing: 'मूल्य',
    nav_about: 'हमारे बारे में',
    nav_login: 'लॉगिन',
    nav_get_started: 'शुरू करें',
    start_practicing: 'अभ्यास शुरू करें',
    explore_features: 'विशेषताएँ देखें',
    start_interview: 'इंटरव्यू शुरू करें',
    continue: 'जारी रखें',
    submit: 'जमा करें',
    skip: 'छोड़ें',
    next: 'अगला',
    previous: 'पिछला',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    good_afternoon: 'नमस्कार',
    ready_improve: 'अपने इंटरव्यू कौशल सुधारने के लिए तैयार?',
    questions_practiced: 'अभ्यास किए गए प्रश्न',
    interviews_completed: 'पूर्ण इंटरव्यू',
    average_score: 'औसत स्कोर',
    current_streak: 'वर्तमान स्ट्रीक',
    skills_improved: 'सुधारे गए कौशल',
    continue_practice: 'अभ्यास जारी रखें',
    recommended: 'आपके लिए अनुशंसित',
    weekly_progress: 'साप्ताहिक प्रगति',
    your_skills: 'आपके कौशल',
    achievements: 'उपलब्धियाँ',
    practice_title: 'तकनीकी इंटरव्यू अभ्यास',
    question: 'प्रश्न',
    difficulty: 'कठिनाई',
    category: 'श्रेणी',
    your_answer: 'आपका उत्तर',
    ai_interview_title: 'एआई मॉक इंटरव्यू',
    listening: 'सुन रहा है...',
    speaking: 'बोल रहा है...',
    ready: 'तैयार',
    end_interview: 'इंटरव्यू समाप्त',
    pause: 'रोकें',
    hero_title: 'स्मार्ट तैयारी। बेहतर इंटरव्यू। नौकरी पाएं।',
    hero_desc: 'छात्रों और नौकरी चाहने वालों के लिए आधुनिक एआई-संचालित तैयारी अनुभव के साथ तकनीकी, एचआर और व्यवहारिक इंटरव्यू का अभ्यास करें।',
    try_ai: 'एआई इंटरव्यू आज़माएं',
    no_interviews: 'अभी तक कोई इंटरव्यू पूरा नहीं हुआ।',
    start_first: 'अपना पहला एआई इंटरव्यू शुरू करें',
    light: 'लाइट',
    dark: 'डार्क',
    system: 'सिस्टम'
  },
  mr: {
    nav_dashboard: 'डॅशबोर्ड',
    nav_practice: 'सराव',
    nav_ai_interview: 'एआय मुलाखत',
    nav_question_bank: 'प्रश्न बँक',
    nav_mock_tests: 'मॉक टेस्ट',
    nav_progress: 'प्रगती',
    nav_achievements: 'उपलब्धी',
    nav_resources: 'संसाधने',
    nav_profile: 'प्रोफाइल',
    nav_settings: 'सेटिंग्ज',
    start_practicing: 'सराव सुरू करा',
    hero_title: 'स्मार्ट तयारी. चांगली मुलाखत. नोकरी मिळवा.',
    hero_desc: 'विद्यार्थी आणि नोकरी शोधणाऱ्यांसाठी आधुनिक एआय-आधारित तयारी अनुभवासह तांत्रिक, एचआर आणि वर्तणूक मुलाखतींचा सराव करा.',
    good_afternoon: 'नमस्कार',
    ready_improve: 'तुमची मुलाखत कौशल्ये सुधारण्यासाठी तयार आहात?',
    questions_practiced: 'सरावलेले प्रश्न',
    interviews_completed: 'पूर्ण मुलाखती',
    average_score: 'सरासरी स्कोअर',
    current_streak: 'सध्याची स्ट्रीक'
  }
  // Other languages can be extended similarly
};

let currentLang = localStorage.getItem(APP_CONFIG.storageKeys.language) || APP_CONFIG.defaultLang;

function t(key) {
  const langData = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return langData[key] || TRANSLATIONS.en[key] || key;
}

function setLanguage(lang) {
  if (!APP_CONFIG.supportedLangs.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(APP_CONFIG.storageKeys.language, lang);
  applyTranslations();
  // Update language selector display
  const langBtn = document.getElementById('current-lang-label');
  if (langBtn) {
    const labels = { en: 'English', hi: 'हिंदी', mr: 'मराठी', ta: 'தமிழ்', te: 'తెలుగు', bn: 'বাংলা', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ', pa: 'ਪੰਜਾਬੀ', ur: 'اردو' };
    langBtn.textContent = labels[lang] || lang;
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translation;
    } else {
      el.textContent = translation;
    }
  });
  // Update document direction for RTL languages if needed
  document.documentElement.lang = currentLang;
  if (currentLang === 'ur') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});

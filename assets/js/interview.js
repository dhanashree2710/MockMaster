let currentQuestions = [];
let currentIndex = 0;
let answers = [];
let timerInterval = null;
let totalSeconds = 0;
let remainingSeconds = 0;
let isRecording = false;
let recognition = null;

function startInterview(type) {
  if (type === 'technical') {
    currentQuestions = [...SAMPLE_QUESTIONS.javascript, ...SAMPLE_QUESTIONS.general].slice(0, 5);
    totalSeconds = 20 * 60;
    document.getElementById('role-label').textContent = 'Technical · Medium · 20 min';
  } else if (type === 'hr') {
    currentQuestions = SAMPLE_QUESTIONS.hr.slice(0, 5);
    totalSeconds = 15 * 60;
    document.getElementById('role-label').textContent = 'HR / Behavioral · Easy · 15 min';
  } else {
    currentQuestions = [
      ...SAMPLE_QUESTIONS.hr.slice(0, 2),
      ...SAMPLE_QUESTIONS.javascript.slice(0, 2),
      ...SAMPLE_QUESTIONS.general.slice(0, 1)
    ];
    totalSeconds = 30 * 60;
    document.getElementById('role-label').textContent = 'Full Interview · Hard · 30 min';
  }

  remainingSeconds = totalSeconds;
  currentIndex = 0;
  answers = [];

  document.getElementById('setup-view').classList.add('d-none');
  document.getElementById('interview-view').classList.remove('d-none');
  document.getElementById('results-view').classList.add('d-none');

  showQuestion();
  startTimer();
  speakQuestion(currentQuestions[0].text);
}

function showQuestion() {
  const q = currentQuestions[currentIndex];
  if (!q) return;

  document.getElementById('q-count').textContent = `Question ${currentIndex + 1} / ${currentQuestions.length}`;
  document.getElementById('q-progress-bar').style.width = `${((currentIndex + 1) / currentQuestions.length) * 100}%`;
  document.getElementById('q-text').textContent = q.text;
  document.getElementById('q-meta').innerHTML = `
    ${difficultyBadge(q.difficulty)}
    <span class="badge badge-app bg-primary bg-opacity-10 text-primary">${q.category}</span>
  `;
  document.getElementById('answer-input').value = '';
}

function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      finishInterview();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-value');
  const container = document.getElementById('timer');
  if (!el) return;
  el.textContent = formatTime(remainingSeconds);
  container.classList.remove('warning', 'danger');
  if (remainingSeconds < 60) container.classList.add('danger');
  else if (remainingSeconds < 180) container.classList.add('warning');
}

function submitAnswer() {
  const text = document.getElementById('answer-input').value.trim();
  answers.push({
    question: currentQuestions[currentIndex],
    answer: text || '(Skipped)'
  });

  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    showQuestion();
    speakQuestion(currentQuestions[currentIndex].text);
  } else {
    finishInterview();
  }
}

function skipQuestion() {
  answers.push({
    question: currentQuestions[currentIndex],
    answer: '(Skipped)'
  });
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    showQuestion();
    speakQuestion(currentQuestions[currentIndex].text);
  } else {
    finishInterview();
  }
}

function finishInterview() {
  clearInterval(timerInterval);
  document.getElementById('interview-view').classList.add('d-none');
  document.getElementById('results-view').classList.remove('d-none');

  const answered = answers.filter(a => a.answer !== '(Skipped)').length;
  const score = Math.min(100, Math.round(60 + (answered / currentQuestions.length) * 30 + Math.random() * 10));
  const used = totalSeconds - remainingSeconds;

  document.getElementById('final-score').textContent = score;
  document.getElementById('score-circle').style.setProperty('--score', score);
  document.getElementById('res-correct').textContent = `${answered}/${currentQuestions.length}`;
  document.getElementById('res-accuracy').textContent = Math.round((answered / currentQuestions.length) * 100) + '%';
  document.getElementById('res-time').textContent = formatTime(used);

  // Update user stats
  const user = getUser();
  user.interviewsCompleted = (user.interviewsCompleted || 0) + 1;
  user.questionsPracticed = (user.questionsPracticed || 0) + currentQuestions.length;
  user.averageScore = Math.round(((user.averageScore || 80) + score) / 2);
  user.credits = (user.credits || 0) + 25;
  saveUser(user);

  showToast('Interview completed! +25 credits earned.', 'success');
}

function speakQuestion(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const status = document.getElementById('ai-status');
  const statusText = document.getElementById('ai-status-text');
  const avatar = document.getElementById('ai-avatar');

  status.className = 'ai-status speaking';
  statusText.textContent = 'Speaking...';
  avatar.classList.add('ai-speaking');

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  utter.onend = () => {
    status.className = 'ai-status ready';
    statusText.textContent = 'Ready';
    avatar.classList.remove('ai-speaking');
  };
  window.speechSynthesis.speak(utter);
}

// Mic support
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'en-IN';
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('answer-input').value += (document.getElementById('answer-input').value ? ' ' : '') + text;
  };
  rec.onend = () => {
    isRecording = false;
    document.getElementById('mic-btn').classList.remove('recording');
  };
  rec.onerror = () => {
    isRecording = false;
    document.getElementById('mic-btn').classList.remove('recording');
    showToast('Microphone error. Please type your answer.', 'warning');
  };
  return rec;
}

document.addEventListener('DOMContentLoaded', () => {
  recognition = initSpeechRecognition();

  document.getElementById('submit-btn')?.addEventListener('click', submitAnswer);
  document.getElementById('skip-btn')?.addEventListener('click', skipQuestion);
  document.getElementById('end-btn')?.addEventListener('click', () => {
    if (confirm('End the interview early?')) finishInterview();
  });

  document.getElementById('mic-btn')?.addEventListener('click', () => {
    if (!recognition) {
      showToast('Speech recognition not supported in this browser.', 'warning');
      return;
    }
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      document.getElementById('mic-btn').classList.remove('recording');
    } else {
      recognition.start();
      isRecording = true;
      document.getElementById('mic-btn').classList.add('recording');
      document.getElementById('ai-status').className = 'ai-status listening';
      document.getElementById('ai-status-text').textContent = 'Listening...';
    }
  });
});

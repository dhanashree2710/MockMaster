document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();

  // Greeting
  const greetEl = document.getElementById('greeting');
  if (greetEl) {
    greetEl.textContent = getGreeting() + ', ' + (user.name.split(' ')[0] || 'there');
  }

  // Stats with animation
  animateCounter(document.getElementById('stat-questions'), user.questionsPracticed);
  animateCounter(document.getElementById('stat-interviews'), user.interviewsCompleted);
  const scoreEl = document.getElementById('stat-score');
  if (scoreEl) {
    let n = 0;
    const target = user.averageScore;
    const timer = setInterval(() => {
      n += 2;
      scoreEl.textContent = Math.min(n, target) + '%';
      if (n >= target) clearInterval(timer);
    }, 20);
  }
  animateCounter(document.getElementById('stat-streak'), user.streak);

  // Badges
  const streakBadge = document.getElementById('streak-badge');
  if (streakBadge) streakBadge.textContent = user.streak;
  const creditsBadge = document.getElementById('credits-badge');
  if (creditsBadge) creditsBadge.textContent = user.credits;

  // Achievements preview
  const achContainer = document.getElementById('achievements-preview');
  if (achContainer) {
    ACHIEVEMENTS.filter(a => a.unlocked).slice(0, 3).forEach(a => {
      achContainer.innerHTML += `
        <div class="achievement-card unlocked">
          <div class="ach-icon">${a.icon}</div>
          <div>
            <div class="fw-semibold small">${a.title}</div>
            <div class="text-muted" style="font-size:0.75rem;">${a.description}</div>
          </div>
        </div>`;
    });
  }
});

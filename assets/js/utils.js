/**
 * Shared utilities
 */
const Utils = {
  $(sel, ctx = document) { return ctx.querySelector(sel); },
  $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; },

  showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container-app');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container-app';
      document.body.appendChild(container);
    }
    const icons = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill', warning: 'exclamation-circle-fill', info: 'info-circle-fill' };
    const el = document.createElement('div');
    el.className = `alert alert-${type === 'danger' ? 'danger' : type} d-flex align-items-center gap-2 shadow`;
    el.style.cssText = 'min-width:280px;border-radius:12px;animation:slideIn 0.3s ease';
    el.innerHTML = `<i class="bi bi-${icons[type] || icons.info}"></i><span></span>`;
    el.querySelector('span').textContent = message == null ? '' : String(message);
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  formatDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  getStored(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  setStored(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  getUser() {
    const s = this.getStored('mm_session', null);
    if (s && (s.fullName || s.email)) {
      return { name: s.fullName || s.email.split('@')[0], email: s.email || '', id: s.userId };
    }
    const u = this.getStored(STORAGE_KEYS.user, null);
    if (u && (u.name || u.email)) {
      return { name: u.name || '', email: u.email || '', id: u.id };
    }
    return { name: '', email: '', id: null };
  },

  isLoggedIn() {
    try {
      if (window.AuthGuard && typeof window.AuthGuard.isLoggedIn === 'function') {
        return window.AuthGuard.isLoggedIn();
      }
      const s = localStorage.getItem('mm_session');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && (parsed.userId || parsed.email)) return true;
      }
      const u = localStorage.getItem('ipa_user');
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed && (parsed.email || parsed.name || parsed.id || parsed.loggedIn)) return true;
      }
      return false;
    } catch { return false; }
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'login.html';
      return false;
    }
    return true;
  },

  scoreColor(score) {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  },

  readinessLabel(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 55) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Beginner';
  }
};

window.Utils = Utils;

/* ---- Credits / Wallet ---- */
const CREDITS_KEY = 'mm_credits';
const CREDITS_HISTORY_KEY = 'mm_credits_history';
const REDEEMED_KEY = 'mm_redeemed';

Utils.getCredits = function () {
  try { return parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10) || 0; } catch { return 0; }
};
Utils.setCredits = function (n) {
  localStorage.setItem(CREDITS_KEY, String(Math.max(0, Math.floor(n))));
};
Utils.addCredits = function (amount, reason) {
  const next = this.getCredits() + amount;
  this.setCredits(next);
  const hist = this.getStored(CREDITS_HISTORY_KEY, []);
  hist.unshift({ amount, reason: reason || 'Interview activity', at: new Date().toISOString(), balance: next });
  this.setStored(CREDITS_HISTORY_KEY, hist.slice(0, 100));
  try { if (window.DB && DB.syncCreditsToCloud) DB.syncCreditsToCloud(next); } catch (_) {}
  return next;
};
Utils.spendCredits = function (amount, reason) {
  const cur = this.getCredits();
  if (cur < amount) return false;
  this.setCredits(cur - amount);
  const hist = this.getStored(CREDITS_HISTORY_KEY, []);
  hist.unshift({ amount: -amount, reason: reason || 'Redeem', at: new Date().toISOString(), balance: cur - amount });
  this.setStored(CREDITS_HISTORY_KEY, hist.slice(0, 100));
  try { if (window.DB && DB.syncCreditsToCloud) DB.syncCreditsToCloud(cur - amount); } catch (_) {}
  return true;
};
Utils.getCreditsHistory = function () {
  return this.getStored(CREDITS_HISTORY_KEY, []);
};
Utils.getRedeemed = function () {
  return this.getStored(REDEEMED_KEY, []);
};
Utils.markRedeemed = function (id) {
  const list = this.getRedeemed();
  if (!list.includes(id)) {
    list.push(id);
    this.setStored(REDEEMED_KEY, list);
  }
};

window.CREDITS_KEY = CREDITS_KEY;

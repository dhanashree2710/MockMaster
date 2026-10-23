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
/* Local cache of unlocked rewards. The real source of truth is the server table
 * reward_purchases (written only after Razorpay payment verification);
 * DB.refreshEntitlements() overwrites this cache from it on every sync. */
Utils.markRedeemed = function (id) {
  const list = this.getRedeemed();
  if (!list.includes(id)) {
    list.push(id);
    this.setStored(REDEEMED_KEY, list);
  }
};

/** True when running inside the Google Play (TWA) app. */
Utils.isPlayApp = function () {
  try {
    if (/^android-app:\/\//.test(document.referrer || '')) localStorage.setItem('mm_twa', '1');
    return localStorage.getItem('mm_twa') === '1';
  } catch (_) { return false; }
};

/* ---- Rewards catalog (single source of truth) ----
 * priceInr = PRICE charged via Razorpay (₹). Minimum ₹9. Prices vary per reward.
 * Payment: Razorpay Checkout (APP_CONFIG.razorpayKeyId). Credits are optional fallback only. */
Utils.MIN_PRICE_INR = 9;
Utils.REWARDS = [
  { id: 'exec360', tag: 'Most Popular', tagClass: 'tag-popular', cost: 25, priceInr: 25,
    title: 'Executive 360° AI Interview Breakdown',
    desc: 'Line-by-line analysis of your last interview: presence, STAR structure and coaching notes for every answer.',
    href: 'rewards/exec-360.html' },
  { id: 'voiceReplay', tag: 'Audio AI', tagClass: 'tag-audio', cost: 15, priceInr: 15,
    title: 'Live AI Voice Tone & Pace Replay',
    desc: 'Speaking pace (WPM), filler-word detection and a confidence index from your last interview answers.',
    href: 'rewards/voice-analysis.html' },
  { id: 'atsOptimizer', tag: 'ATS · ₹9', tagClass: 'tag-ats', cost: 9, priceInr: 9,
    title: 'AI Resume & ATS Alignment Optimizer',
    desc: 'Match your resume to a job description and download an ATS-friendly version.',
    href: 'rewards/ats-optimizer.html' },
  { id: 'tier1Pack', tag: 'Premium Pack', tagClass: 'tag-pack', cost: 30, priceInr: 30,
    title: 'Tier-1 Tech Insider Question Pack',
    desc: 'Ten curated behavioral, system-design and technical questions in the style of top product companies, ready to practise as a mock interview.',
    href: 'rewards/tier1-pack.html' }
];
Utils.getReward = function (id) { return Utils.REWARDS.find(function (r) { return r.id === id; }) || null; };
/** Price charged to the user (₹). Always ≥ MIN_PRICE_INR. */
Utils.rewardPrice = function (r) {
  var p = Number(r && (r.priceInr != null ? r.priceInr : r.cost)) || 0;
  return Math.max(Utils.MIN_PRICE_INR, p);
};
Utils.rewardPrize = function (r) { return Utils.rewardPrice(r); };
Utils.MIN_PRIZE_INR = Utils.MIN_PRICE_INR;

Utils.getRazorpayKey = function () {
  try {
    var c = window.APP_CONFIG || {};
    return (c.razorpayKeyId || '').trim();
  } catch (_) { return ''; }
};

/** Load Razorpay Checkout script once. */
Utils.loadRazorpay = function () {
  return new Promise(function (resolve, reject) {
    if (window.Razorpay) return resolve(window.Razorpay);
    var s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = function () { resolve(window.Razorpay); };
    s.onerror = function () { reject(new Error('Could not load Razorpay. Check your network.')); };
    document.head.appendChild(s);
  });
};

/**
 * Pay for a reward. Flow: server creates the order (server decides the price) ->
 * Razorpay Checkout -> server verifies the signature + payment -> unlock.
 * Resolves { ok, paymentId, reward, price } on success; { ok:false, cancelled|error } otherwise.
 */
Utils.functionsBase = function () {
  var u = (window.APP_CONFIG && APP_CONFIG.aiProxyUrl) || '';
  return u.replace(/\/ai-chat\/?$/, '');
};
Utils.callPaymentFn = async function (name, body) {
  var token = window.DB && DB.getAccessToken ? await DB.getAccessToken() : null;
  if (!token) throw new Error('Please sign in again to continue.');
  var base = Utils.functionsBase();
  if (!base) throw new Error('Payments are not configured.');
  var res = await fetch(base + '/' + name, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  var data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data.error || 'Payment service error (' + res.status + ')');
  return data;
};

Utils.payWithRazorpay = function (rewardId) {
  var r = Utils.getReward(rewardId);
  if (!r) return Promise.resolve({ ok: false, error: 'Unknown reward.' });
  if (Utils.getRedeemed().includes(rewardId)) {
    return Promise.resolve({ ok: true, already: true, reward: r, price: 0 });
  }
  if (Utils.isPlayApp() && !(window.APP_CONFIG && APP_CONFIG.paidUnlocksInPlayApp)) {
    return Promise.resolve({ ok: false, error: 'Paid reports are available on the MockMaster website, not in the Android app.' });
  }
  var price = Utils.rewardPrice(r);
  var user = {};
  try { user = Utils.getUser() || {}; } catch (_) {}

  return Utils.callPaymentFn('razorpay-order', { reward_id: r.id }).then(function (order) {
    if (order.already) {
      Utils.markRedeemed(r.id);
      return { ok: true, already: true, reward: r, price: 0 };
    }
    return Utils.loadRazorpay().then(function (Razorpay) {
      return new Promise(function (resolve) {
        var options = {
          key: order.key_id,
          order_id: order.order_id,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: (window.APP_CONFIG && (APP_CONFIG.companyName || APP_CONFIG.name)) || 'MockMaster',
          description: r.title + ' — ₹' + price,
          image: '../assets/images/icon-192.png',
          prefill: { name: user.name || '', email: user.email || '', contact: '' },
          notes: { reward_id: r.id, product: r.title },
          theme: { color: '#2B5748' },
          modal: {
            ondismiss: function () { resolve({ ok: false, cancelled: true, error: 'Payment cancelled.' }); }
          },
          handler: function (response) {
            Utils.callPaymentFn('razorpay-verify', {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            }).then(function () {
              Utils.markRedeemed(r.id);
              try {
                var purchases = JSON.parse(localStorage.getItem('mm_purchases') || '[]');
                purchases.unshift({ id: r.id, title: r.title, inr: price,
                  paymentId: response.razorpay_payment_id || '', at: new Date().toISOString(), method: 'razorpay' });
                localStorage.setItem('mm_purchases', JSON.stringify(purchases.slice(0, 50)));
              } catch (_) {}
              resolve({ ok: true, reward: r, price: price, paymentId: response.razorpay_payment_id || '' });
            }).catch(function (err) {
              resolve({ ok: false, error: ((err && err.message) || 'Could not verify payment') +
                '. If money was deducted, contact support with payment ID ' + (response.razorpay_payment_id || '') + '.' });
            });
          }
        };
        try {
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            var msg = (resp && resp.error && (resp.error.description || resp.error.reason)) || 'Payment failed.';
            resolve({ ok: false, error: msg });
          });
          rzp.open();
        } catch (err) {
          resolve({ ok: false, error: (err && err.message) || 'Could not open payment.' });
        }
      });
    });
  }).catch(function (err) {
    return { ok: false, error: (err && err.message) || 'Payment failed.' };
  });
};

/**
 * Unlock via Razorpay (preferred). Falls back to credits only if Razorpay key is missing.
 */
Utils.redeemReward = function (id) {
  var r = Utils.getReward(id);
  if (!r) return { ok: false, error: 'Unknown reward.' };
  if (Utils.getRedeemed().includes(id)) return { ok: true, already: true, reward: r, price: 0 };
  return { ok: false, async: true, error: 'Use payWithRazorpay for paid unlock.' };
};

/** Gate for reward pages: returns true if unlocked, else renders a "pay to unlock" card. */
Utils.requireReward = function (id, el, base) {
  if (Utils.getRedeemed().includes(id)) return true;
  var r = Utils.getReward(id);
  if (el && r) {
    var price = Utils.rewardPrice(r);
    el.innerHTML = '<div class="card-app"><div class="card-body"><p class="mb-2">Unlock <strong>' + r.title + '</strong> for ' +
      '<strong>₹' + price + '</strong>.</p>' +
      '<p class="text-muted small mb-3">Pay securely with UPI, card, or netbanking via Razorpay.</p>' +
      '<a href="' + (base || '../') + 'rewards.html" class="btn-primary-app">Go to Rewards &amp; Pay</a></div></div>';
  }
  return false;
};

/** Only real interviews (with answers). Also removes empty 0% rows left behind by older versions. */
Utils.getRealSessions = function () {
  var all = Utils.getStored(STORAGE_KEYS.sessions, []) || [];
  var real = all.filter(function (x) { return x && ((x.answers || []).length || Number(x.score) > 0); });
  if (real.length !== all.length) Utils.setStored(STORAGE_KEYS.sessions, real);
  return real;
};

window.CREDITS_KEY = CREDITS_KEY;

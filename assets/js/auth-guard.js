/**
 * Auth Guard — Login required popup + session helpers (Supabase / localStorage)
 */
(function () {
  const PUBLIC = ['index.html', 'login.html', 'register.html', 'privacy.html', 'delete-account.html', 'forgot-password.html', ''];

  function currentPage() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function hasAuthToken() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.+-auth-token$/.test(k)) return true;
      }
    } catch (_) {}
    return false;
  }

  function isLoggedIn() {
    // Need BOTH the local profile marker and a real Supabase Auth token.
    try {
      const raw = localStorage.getItem('mm_session');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.userId && p.userId !== 'demo' && hasAuthToken()) return true;
      }
    } catch (_) {}
    return false;
  }

  function loginPath() {
    const path = window.location.pathname;
    if (path.includes('/pages/resume/') || path.includes('/pages/job/') ||
        path.includes('/pages/preparation/') || path.includes('/pages/interview/') ||
        path.includes('/pages/report/') || path.includes('/pages/rewards/')) {
      return '../../pages/login.html';
    }
    if (path.includes('/pages/')) return 'login.html';
    return 'pages/login.html';
  }

  function homePath() {
    const path = window.location.pathname;
    if (path.includes('/pages/resume/') || path.includes('/pages/job/') ||
        path.includes('/pages/preparation/') || path.includes('/pages/interview/') ||
        path.includes('/pages/report/') || path.includes('/pages/rewards/')) {
      return '../../index.html';
    }
    if (path.includes('/pages/')) return '../index.html';
    return 'index.html';
  }

  function showLoginPopup() {
    if (document.getElementById('loginRequiredModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loginRequiredModal';
    overlay.innerHTML = `
      <style>
        #loginRequiredModal {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(39, 51, 56, 0.75);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem; animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        #loginRequiredModal .modal-card {
          background: #fff; border-radius: 20px; padding: 2rem 1.75rem;
          max-width: 380px; width: 100%; text-align: center;
          box-shadow: 0 25px 50px -12px rgba(39, 51, 56, 0.45);
          animation: slideUp 0.35s ease;
        }
        #loginRequiredModal .modal-icon {
          width: 64px; height: 64px; margin: 0 auto 1rem; border-radius: 50%;
          background: linear-gradient(135deg, #9CB080, #2B5748);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.6rem;
        }
        #loginRequiredModal h3 {
          font-family: Inter, system-ui, sans-serif;
          font-size: 1.25rem; font-weight: 800; color: #273338; margin: 0 0 0.5rem;
        }
        #loginRequiredModal p {
          font-family: Inter, system-ui, sans-serif;
          font-size: 0.9rem; color: #5c6b64; margin: 0 0 1.25rem; line-height: 1.5;
        }
        #loginRequiredModal .btn-login {
          display: inline-block; padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #618764, #2B5748);
          color: #fff; border: none; border-radius: 12px;
          font-weight: 700; font-size: 0.925rem; text-decoration: none;
          box-shadow: 0 4px 14px rgba(43, 87, 72, 0.35);
        }
        #loginRequiredModal .btn-close-modal {
          display: block; margin: 1rem auto 0; background: none; border: none;
          color: #6b7c75; font-size: 0.85rem; cursor: pointer; text-decoration: underline;
        }
      </style>
      <div class="modal-card">
        <div class="modal-icon"><i class="bi bi-lock-fill"></i></div>
        <h3>Login Required</h3>
        <p>Please sign in to access this page and practice your mock interview.</p>
        <a href="${loginPath()}" class="btn-login">Sign In / Sign Up</a>
        <a href="${homePath()}" class="btn-close-modal">Return to Home</a>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const LOCAL_USER_KEYS = [
    'mm_session', 'ipa_user', 'ipa_resume', 'ipa_job', 'ipa_match', 'ipa_sessions', 'ipa_progress',
    'mm_credits', 'mm_credits_history', 'mm_redeemed', 'mm_user_progress'
  ];

  function wipeLocal() {
    try {
      LOCAL_USER_KEYS.forEach((k) => localStorage.removeItem(k));
      const rm = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.+-auth-token/.test(k)) rm.push(k);
      }
      rm.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  }

  function logout() {
    const go = () => { wipeLocal(); window.location.href = loginPath(); };
    try {
      if (window.DB && typeof DB.signOut === 'function') {
        DB.signOut().then(go, go);
        return;
      }
    } catch (_) {}
    go();
  }
  function bindLogoutButtons() {
    document.querySelectorAll('#logoutBtn, #drawerLogout, [data-logout], .logout-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = currentPage();
    if (!PUBLIC.includes(page) && !isLoggedIn()) {
      showLoginPopup();
    } else if (!PUBLIC.includes(page) && window.DB && typeof DB.verifySession === 'function') {
      // Token may have expired / been revoked (e.g. account deleted elsewhere)
      DB.verifySession().then((ok) => {
        if (!ok) { wipeLocal(); showLoginPopup(); }
      });
    }
    bindLogoutButtons();
  });

  window.AuthGuard = {
    isLoggedIn,
    requireLogin(e) {
      if (isLoggedIn()) return true;
      if (e) e.preventDefault();
      showLoginPopup();
      return false;
    },
    showLoginPopup,
    logout
  };
})();

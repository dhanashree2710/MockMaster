/**
 * Auth Guard — Login required popup + session helpers (Supabase / localStorage)
 */
(function () {
  const PUBLIC = ['index.html', 'login.html', 'register.html', ''];

  function currentPage() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function isLoggedIn() {
    try {
      if (localStorage.getItem('mm_session')) return true;
      const u = localStorage.getItem('ipa_user');
      if (!u) return false;
      const parsed = JSON.parse(u);
      return !!(parsed && (parsed.email || parsed.name || parsed.id || parsed.loggedIn));
    } catch {
      return false;
    }
  }

  function loginPath() {
    const path = window.location.pathname;
    if (path.includes('/pages/resume/') || path.includes('/pages/job/') ||
        path.includes('/pages/preparation/') || path.includes('/pages/interview/') ||
        path.includes('/pages/report/')) {
      return '../../pages/login.html';
    }
    if (path.includes('/pages/')) return 'login.html';
    return 'pages/login.html';
  }

  function showLoginPopup() {
    if (document.getElementById('loginRequiredModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loginRequiredModal';
    overlay.innerHTML = `
      <style>
        #loginRequiredModal {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(39, 51, 56, 0.55);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem; animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        #loginRequiredModal .modal-card {
          background: #fff; border-radius: 20px; padding: 2rem 1.75rem;
          max-width: 380px; width: 100%; text-align: center;
          box-shadow: 0 25px 50px -12px rgba(39, 51, 56, 0.3);
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
          color: #6b7c75; font-size: 0.85rem; cursor: pointer;
        }
      </style>
      <div class="modal-card">
        <div class="modal-icon"><i class="bi bi-lock-fill"></i></div>
        <h3>Login Required</h3>
        <p>Please sign in first to access this page and continue your interview preparation.</p>
        <a href="${loginPath()}" class="btn-login">Sign In / Sign Up</a>
        <button type="button" class="btn-close-modal" id="popupCloseBtn">Maybe later</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('popupCloseBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function logout() {
    try {
      if (window.DB && typeof DB.clearSession === 'function') DB.clearSession();
    } catch (_) {}
    localStorage.removeItem('mm_session');
    localStorage.removeItem('ipa_user');
    try {
      if (window.STORAGE_KEYS && STORAGE_KEYS.user) localStorage.removeItem(STORAGE_KEYS.user);
    } catch (_) {}
    window.location.href = loginPath();
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

/**
 * MockMaster — In-app media permissions helper
 * Handles microphone (and optional camera) permission with a polished in-app UI
 * before the browser prompt, plus status checks via Permissions API.
 */
(function (global) {
  'use strict';

  const PERM_STORAGE_KEY = 'mm_mic_permission';

  function isSecureContext() {
    return !!(global.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  }

  /**
   * Query current microphone permission state.
   * @returns {Promise<'granted'|'denied'|'prompt'|'unsupported'>}
   */
  async function getMicPermissionState() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'unsupported';
    }
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' });
        return status.state; // 'granted' | 'denied' | 'prompt'
      }
    } catch (_) {
      // Some browsers (Safari) don't support microphone in Permissions API
    }
    // Fallback: check last known from our storage (not authoritative)
    try {
      const stored = localStorage.getItem(PERM_STORAGE_KEY);
      if (stored === 'granted' || stored === 'denied') return stored;
    } catch (_) {}
    return 'prompt';
  }

  /**
   * Actually request microphone access via getUserMedia.
   * Stops tracks immediately after success (permission only).
   * @returns {Promise<{granted: boolean, error?: string}>}
   */
  async function requestMicrophoneAccess() {
    if (!isSecureContext()) {
      return { granted: false, error: 'secure_context' };
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { granted: false, error: 'unsupported' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      stream.getTracks().forEach((t) => t.stop());
      try { localStorage.setItem(PERM_STORAGE_KEY, 'granted'); } catch (_) {}
      return { granted: true };
    } catch (err) {
      const name = (err && err.name) || '';
      let error = 'unknown';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') error = 'denied';
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') error = 'no_device';
      else if (name === 'NotReadableError' || name === 'TrackStartError') error = 'in_use';
      else if (name === 'OverconstrainedError') error = 'overconstrained';
      else if (name === 'SecurityError') error = 'secure_context';
      try { localStorage.setItem(PERM_STORAGE_KEY, error === 'denied' ? 'denied' : 'prompt'); } catch (_) {}
      return { granted: false, error, raw: err };
    }
  }

  /**
   * Ensure a shared permission modal exists in the DOM.
   */
  function ensurePermissionModal() {
    let modal = document.getElementById('mmPermissionModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'mmPermissionModal';
    modal.className = 'mm-perm-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'mmPermTitle');
    modal.innerHTML = `
      <div class="mm-perm-card">
        <div class="mm-perm-icon-wrap">
          <i class="bi bi-mic-fill" id="mmPermIcon"></i>
        </div>
        <h2 id="mmPermTitle" class="mm-perm-title">Microphone access</h2>
        <p class="mm-perm-desc" id="mmPermDesc">
          MockMaster needs your microphone so you can answer interview questions by voice.
          Your audio is processed only in the browser for speech-to-text and is never uploaded unless you choose to.
        </p>
        <ul class="mm-perm-bullets" id="mmPermBullets">
          <li><i class="bi bi-check-circle-fill"></i> Speak answers instead of typing</li>
          <li><i class="bi bi-check-circle-fill"></i> Real-time speech-to-text during interviews</li>
          <li><i class="bi bi-check-circle-fill"></i> You can still type if you prefer</li>
        </ul>
        <div class="mm-perm-status d-none" id="mmPermStatus"></div>
        <div class="mm-perm-actions">
          <button type="button" class="btn-outline-app" id="mmPermSkip">Continue without mic</button>
          <button type="button" class="btn-primary-app" id="mmPermAllow">
            <i class="bi bi-mic me-1"></i> Allow microphone
          </button>
        </div>
        <p class="mm-perm-hint" id="mmPermHint">
          After you tap Allow, your browser will show a system prompt. Choose <strong>Allow</strong>.
        </p>
      </div>
    `;
    document.body.appendChild(modal);

    // Basic styles if not already present
    if (!document.getElementById('mmPermStyles')) {
      const style = document.createElement('style');
      style.id = 'mmPermStyles';
      style.textContent = `
        .mm-perm-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(15, 23, 22, 0.72);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem;
          opacity: 0; visibility: hidden;
          transition: opacity 0.25s ease, visibility 0.25s ease;
        }
        .mm-perm-overlay.is-open {
          opacity: 1; visibility: visible;
        }
        .mm-perm-card {
          background: var(--surface, #fff);
          color: var(--text, #1a1a1a);
          border-radius: 20px;
          max-width: 420px; width: 100%;
          padding: 1.75rem 1.5rem 1.5rem;
          box-shadow: 0 24px 64px rgba(0,0,0,0.35);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          transform: translateY(12px) scale(0.98);
          transition: transform 0.28s cubic-bezier(0.22,1,0.36,1);
        }
        .mm-perm-overlay.is-open .mm-perm-card {
          transform: translateY(0) scale(1);
        }
        .mm-perm-icon-wrap {
          width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, rgba(43,87,72,0.15), rgba(156,176,128,0.2));
          color: var(--primary, #2B5748);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.75rem; margin: 0 auto 1rem;
        }
        .mm-perm-icon-wrap.is-denied { color: #b45309; background: rgba(180,83,9,0.12); }
        .mm-perm-icon-wrap.is-ok { color: #15803d; background: rgba(21,128,61,0.12); }
        .mm-perm-title { font-size: 1.35rem; font-weight: 700; text-align: center; margin: 0 0 0.5rem; }
        .mm-perm-desc { font-size: 0.92rem; line-height: 1.5; color: var(--text-muted, #64748b); text-align: center; margin: 0 0 1rem; }
        .mm-perm-bullets { list-style: none; padding: 0; margin: 0 0 1.25rem; }
        .mm-perm-bullets li {
          display: flex; align-items: flex-start; gap: 0.5rem;
          font-size: 0.88rem; margin-bottom: 0.45rem; color: var(--text, #1a1a1a);
        }
        .mm-perm-bullets i { color: var(--primary, #2B5748); margin-top: 2px; flex-shrink: 0; }
        .mm-perm-status {
          border-radius: 12px; padding: 0.75rem 1rem; margin-bottom: 1rem;
          font-size: 0.88rem; line-height: 1.45;
        }
        .mm-perm-status.is-error { background: rgba(185,28,28,0.1); color: #b91c1c; }
        .mm-perm-status.is-warn { background: rgba(180,83,9,0.12); color: #b45309; }
        .mm-perm-status.is-ok { background: rgba(21,128,61,0.1); color: #15803d; }
        .mm-perm-actions {
          display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: stretch;
        }
        .mm-perm-actions .btn-outline-app,
        .mm-perm-actions .btn-primary-app {
          flex: 1 1 140px; justify-content: center;
        }
        .mm-perm-hint {
          margin: 1rem 0 0; font-size: 0.78rem; color: var(--text-muted, #94a3b8);
          text-align: center; line-height: 1.4;
        }
        @media (max-width: 480px) {
          .mm-perm-card { padding: 1.35rem 1.1rem 1.2rem; }
          .mm-perm-actions { flex-direction: column-reverse; }
        }
      `;
      document.head.appendChild(style);
    }
    return modal;
  }

  /**
   * Show the in-app permission dialog.
   * @param {object} opts
   * @param {boolean} [opts.required=false] - if true, Skip is less prominent
   * @returns {Promise<{granted: boolean, skipped?: boolean, error?: string}>}
   */
  function showPermissionDialog(opts = {}) {
    return new Promise((resolve) => {
      const modal = ensurePermissionModal();
      const title = document.getElementById('mmPermTitle');
      const desc = document.getElementById('mmPermDesc');
      const bullets = document.getElementById('mmPermBullets');
      const statusEl = document.getElementById('mmPermStatus');
      const hint = document.getElementById('mmPermHint');
      const iconWrap = modal.querySelector('.mm-perm-icon-wrap');
      const icon = document.getElementById('mmPermIcon');
      const allowBtn = document.getElementById('mmPermAllow');
      const skipBtn = document.getElementById('mmPermSkip');

      // Reset UI
      title.textContent = 'Microphone access';
      desc.textContent =
        'MockMaster needs your microphone so you can answer interview questions by voice. Your audio stays in the browser for speech-to-text and is not uploaded unless you choose to.';
      bullets.classList.remove('d-none');
      statusEl.className = 'mm-perm-status d-none';
      statusEl.textContent = '';
      hint.classList.remove('d-none');
      hint.innerHTML = 'After you tap Allow, your browser will show a system prompt. Choose <strong>Allow</strong>.';
      iconWrap.className = 'mm-perm-icon-wrap';
      if (icon) icon.className = 'bi bi-mic-fill';
      allowBtn.disabled = false;
      allowBtn.innerHTML = '<i class="bi bi-mic me-1"></i> Allow microphone';
      skipBtn.textContent = opts.required ? 'Type answers only' : 'Continue without mic';
      skipBtn.classList.remove('d-none');

      function close() {
        modal.classList.remove('is-open');
        allowBtn.onclick = null;
        skipBtn.onclick = null;
      }

      allowBtn.onclick = async () => {
        allowBtn.disabled = true;
        allowBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Requesting…';
        const result = await requestMicrophoneAccess();
        if (result.granted) {
          iconWrap.className = 'mm-perm-icon-wrap is-ok';
          if (icon) icon.className = 'bi bi-check-lg';
          title.textContent = 'Microphone ready';
          desc.textContent = 'You can speak your answers during the interview. Switch to typing anytime.';
          bullets.classList.add('d-none');
          statusEl.className = 'mm-perm-status is-ok';
          statusEl.textContent = 'Permission granted. You can start the interview.';
          statusEl.classList.remove('d-none');
          hint.classList.add('d-none');
          allowBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Continue';
          allowBtn.disabled = false;
          skipBtn.classList.add('d-none');
          allowBtn.onclick = () => {
            close();
            resolve({ granted: true });
          };
          // Auto-continue shortly
          setTimeout(() => {
            if (modal.classList.contains('is-open')) {
              close();
              resolve({ granted: true });
            }
          }, 900);
        } else {
          iconWrap.className = 'mm-perm-icon-wrap is-denied';
          if (icon) icon.className = 'bi bi-mic-mute-fill';
          title.textContent = 'Microphone blocked';
          bullets.classList.add('d-none');
          statusEl.classList.remove('d-none');
          allowBtn.disabled = false;
          allowBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Try again';

          const messages = {
            denied:
              'Permission was denied. To enable voice answers: open your browser site settings for this page and allow Microphone, then try again.',
            no_device: 'No microphone was found on this device. You can still type your answers.',
            in_use: 'The microphone is being used by another app. Close it and try again.',
            secure_context:
              'Microphone requires a secure connection (HTTPS). Open the app over HTTPS or localhost.',
            unsupported: 'This browser does not support microphone access. Please use Chrome, Edge, or Safari, or type your answers.',
            unknown: 'Could not access the microphone. You can still type your answers.'
          };
          statusEl.className = 'mm-perm-status is-error';
          statusEl.textContent = messages[result.error] || messages.unknown;
          hint.innerHTML =
            result.error === 'denied'
              ? 'On Chrome: click the lock icon in the address bar → Site settings → Microphone → Allow.'
              : 'You can continue and type answers instead.';
        }
      };

      skipBtn.onclick = () => {
        close();
        resolve({ granted: false, skipped: true });
      };

      modal.classList.add('is-open');
    });
  }

  /**
   * High-level: ensure mic permission for interview flow.
   * Shows in-app dialog when state is prompt or when force is true.
   * @param {{ force?: boolean, silent?: boolean }} opts
   */
  async function ensureMicrophonePermission(opts = {}) {
    const state = await getMicPermissionState();

    if (state === 'granted') {
      return { granted: true, state };
    }
    if (state === 'unsupported') {
      if (!opts.silent) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Speech input is not supported in this browser. You can type answers.', 'warning');
        }
      }
      return { granted: false, state, error: 'unsupported' };
    }
    if (state === 'denied' && !opts.force) {
      // Still offer the dialog so user sees how to fix it
      const result = await showPermissionDialog({ required: false });
      return { ...result, state: result.granted ? 'granted' : 'denied' };
    }
    // prompt or force
    const result = await showPermissionDialog({ required: !!opts.required });
    return { ...result, state: result.granted ? 'granted' : (result.skipped ? 'prompt' : 'denied') };
  }

  /**
   * Update a status badge element (optional helper for settings / setup).
   * @param {HTMLElement|string} el
   */
  async function renderMicStatusBadge(el) {
    const node = typeof el === 'string' ? document.querySelector(el) : el;
    if (!node) return;
    const state = await getMicPermissionState();
    const map = {
      granted: { text: 'Allowed', class: 'badge bg-success' },
      denied: { text: 'Blocked', class: 'badge bg-danger' },
      prompt: { text: 'Not asked yet', class: 'badge bg-secondary' },
      unsupported: { text: 'Unsupported', class: 'badge bg-warning text-dark' }
    };
    const m = map[state] || map.prompt;
    node.className = m.class;
    node.textContent = m.text;
    return state;
  }

  global.AppPermissions = {
    getMicPermissionState,
    requestMicrophoneAccess,
    showPermissionDialog,
    ensureMicrophonePermission,
    renderMicStatusBadge,
    isSecureContext
  };
})(typeof window !== 'undefined' ? window : this);

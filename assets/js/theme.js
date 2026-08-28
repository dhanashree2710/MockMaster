/**
 * Theme management — Light / Dark / System
 */
(function () {
  const KEY = 'ipa_theme';

  function getPreferred() {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0b1120' : '#4f46e5';
  }

  function setTheme(theme) {
    if (theme === 'system') {
      localStorage.removeItem(KEY);
      apply(getPreferred());
    } else {
      localStorage.setItem(KEY, theme);
      apply(theme);
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: getPreferred() } }));
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Init
  apply(getPreferred());

  // Listen for system changes when using system preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(KEY)) apply(getPreferred());
  });

  window.Theme = { get: getPreferred, set: setTheme, toggle };
})();

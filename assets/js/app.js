/**
 * Interview Pro AI — Core App Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle buttons
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => Theme.toggle());
  });

  // Highlight active sidebar / bottom nav
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar .nav-link, .bottom-nav a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes(path) || (path === '' && href.includes('dashboard'))) {
      link.classList.add('active');
    }
  });

  // Update user name in UI
  const user = Utils.getUser();
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.name || 'User';
  });

  // Greeting
  document.querySelectorAll('[data-greeting]').forEach(el => {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    el.textContent = `${greet}, ${user.name?.split(' ')[0] || 'there'}`;
  });
});


/* Floating bead bottom dock */
(function initDockBead() {
  function placeBead(nav, instant) {
    const bead = nav.querySelector('.dock-bead');
    const active = nav.querySelector('a.active') || nav.querySelector('a');
    if (!bead || !active) return;
    const navRect = nav.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const x = aRect.left + aRect.width / 2 - navRect.left - bead.offsetWidth / 2;
    const icon = active.querySelector('i');
    if (icon) {
      bead.innerHTML = '';
      const clone = icon.cloneNode(true);
      bead.appendChild(clone);
    }
    if (instant) bead.style.transition = 'none';
    bead.style.left = Math.max(4, x) + 'px';
    if (instant) {
      requestAnimationFrame(() => { bead.style.transition = ''; });
    }
  }

  function bind(nav) {
    if (!nav || nav.dataset.dockBound) return;
    nav.dataset.dockBound = '1';
    if (!nav.querySelector('.dock-bead')) {
      const bead = document.createElement('div');
      bead.className = 'dock-bead';
      bead.setAttribute('aria-hidden', 'true');
      nav.insertBefore(bead, nav.firstChild);
    }
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', function () {
        nav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        const bead = nav.querySelector('.dock-bead');
        if (bead) bead.classList.add('is-moving');
        placeBead(nav, false);
        setTimeout(() => bead && bead.classList.remove('is-moving'), 400);
      });
    });
    placeBead(nav, true);
    window.addEventListener('resize', () => placeBead(nav, true));
  }

  function boot() {
    document.querySelectorAll('nav.bottom-nav').forEach(bind);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

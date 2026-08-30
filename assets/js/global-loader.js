/**
 * MockMaster — Global Hourglass Loader
 * Shows on every page for a short time, then reveals the page.
 * API: MockMasterLoader.show('Message') / MockMasterLoader.hide()
 */
(function (global) {
  var OVERLAY_ID = 'mmGlobalHourglassLoader';
  var MIN_MS = 900;   // visible at least this long
  var MAX_MS = 2200;  // never block longer
  var hideTimer = null;
  var shownAt = 0;

  function ensureOverlay() {
    var el = document.getElementById(OVERLAY_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.className = 'hourglass-loader-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Loading');
    el.innerHTML =
      '<div class="hourglass-loader" aria-hidden="true">' +
      '  <span class="hg-cap-top"></span>' +
      '  <span class="hg-neck"></span>' +
      '  <span class="hg-cap-bottom"></span>' +
      '</div>' +
      '<p class="loader-caption" id="mmGlobalLoaderCaption">Loading</p>';
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function show(message) {
    var el = ensureOverlay();
    var cap = document.getElementById('mmGlobalLoaderCaption');
    if (cap) cap.textContent = message || 'Loading';
    el.style.display = 'flex';
    el.classList.remove('is-hiding');
    shownAt = Date.now();
  }

  function hide() {
    var el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    var elapsed = Date.now() - (shownAt || Date.now());
    var wait = Math.max(0, MIN_MS - elapsed);

    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      el.classList.add('is-hiding');
      setTimeout(function () {
        el.style.display = 'none';
        el.classList.remove('is-hiding');
      }, 300);
    }, wait);
  }

  function boot() {
    try { show('Loading'); } catch (_) {}

    function done() {
      hide();
    }

    if (document.readyState === 'complete') {
      done();
    } else {
      window.addEventListener('load', done);
      setTimeout(hide, MAX_MS);
    }
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);

  global.MockMasterLoader = { show: show, hide: hide };
})(window);

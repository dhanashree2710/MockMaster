/**
 * MockMaster — safe-html.js  (load FIRST on every page)
 *
 * Defence-in-depth against XSS. Resume text, job descriptions and AI replies
 * are untrusted. This file:
 *   1. exposes window.esc(value)  — HTML-escape helper for templates
 *   2. wraps the Element.innerHTML setter so anything assigned goes through a
 *      sanitizer that removes <script>/<iframe>/<object>/<embed>/<base>/<meta>/<link>,
 *      every on*="" attribute, and javascript:/data:text/html URLs.
 * Plain markup that the app itself writes (icons, spans, styles) is untouched.
 */
(function () {
  'use strict';

  window.esc = function (v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  var BLOCKED = 'script,iframe,frame,frameset,object,embed,base,meta,link,applet,noscript';
  var URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'data', 'srcdoc'];

  function badUrl(v) {
    var s = String(v).replace(/[\u0000-\u0020\u00a0]+/g, '').toLowerCase();
    return s.indexOf('javascript:') === 0 || s.indexOf('vbscript:') === 0 ||
           s.indexOf('data:text/html') === 0 || s.indexOf('data:application') === 0;
  }

  function clean(root) {
    root.querySelectorAll(BLOCKED).forEach(function (n) { n.remove(); });
    root.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        var name = a.name.toLowerCase();
        if (name.indexOf('on') === 0 || name === 'srcdoc') { el.removeAttribute(a.name); return; }
        if (URL_ATTRS.indexOf(name) !== -1 && badUrl(a.value)) el.removeAttribute(a.name);
      });
    });
  }

  window.sanitizeHtml = function (html) {
    var t = document.createElement('template');
    t.innerHTML = html;           // template content is inert (nothing executes)
    clean(t.content);
    return t.innerHTML;
  };

  try {
    var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (desc && desc.set && desc.get) {
      var nativeSet = desc.set;
      var tpl = document.createElement('template');
      var tplSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
      Object.defineProperty(Element.prototype, 'innerHTML', {
        configurable: true,
        enumerable: desc.enumerable,
        get: desc.get,
        set: function (value) {
          if (typeof value === 'string' && value.indexOf('<') !== -1) {
            try {
              var t = document.createElement('template');
              tplSet.call(t, value);
              clean(t.content);
              value = desc.get.call(t);
            } catch (_) { /* fall through with original */ }
          }
          nativeSet.call(this, value);
        }
      });
    }
  } catch (e) { /* never break the app */ }
})();

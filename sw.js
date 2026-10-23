/* MockMaster PWA service worker — v3.3
 * - App shell (HTML/JS/manifest): network-first, cache fallback
 * - Static assets + approved CDN libraries/fonts: stale-while-revalidate
 * - Supabase / AI / any other origin: never cached (always network)
 */
const CACHE = 'mockmaster-v3.3';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/variables.css',
  './assets/css/style.css',
  './assets/css/responsive.css',
  './assets/css/loader.css',
  './assets/js/safe-html.js',
  './assets/js/config.js',
  './assets/js/utils.js',
  './assets/js/app.js',
  './assets/js/theme.js',
  './assets/js/supabase-client.js',
  './assets/js/auth-guard.js',
  './assets/images/mockmaster-logo.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './vendor/bootstrap/bootstrap.min.css',
  './vendor/bootstrap/bootstrap.bundle.min.js',
  './vendor/bootstrap-icons/font/bootstrap-icons.min.css',
  './vendor/bootstrap-icons/font/fonts/bootstrap-icons.woff2',
  './vendor/supabase/supabase.js',
  './pages/login.html',
  './pages/dashboard.html',
  './pages/privacy.html'
];

// Third-party static hosts that are safe to cache (public libraries/fonts only)
const CDN_HOSTS = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(req, res) {
  // ok responses, plus opaque ones (cross-origin <script>/<link> without CORS)
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);

  // Never intercept Supabase, AI providers or anything else
  if (!sameOrigin && !isCdn) return;

  const isAppShell =
    sameOrigin && (
      req.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.webmanifest')
    );

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => { putInCache(req, res); return res; })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Static assets & CDN libs: serve cache instantly, refresh in background
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => { putInCache(req, res); return res; })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

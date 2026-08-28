/* MockMaster PWA service worker */
const CACHE = 'mockmaster-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/variables.css',
  './assets/css/style.css',
  './assets/css/responsive.css',
  './assets/js/config.js',
  './assets/js/utils.js',
  './assets/js/app.js',
  './assets/js/theme.js',
  './assets/images/mockmaster-logo.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './pages/login.html',
  './pages/dashboard.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok && (req.url.startsWith(self.location.origin))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

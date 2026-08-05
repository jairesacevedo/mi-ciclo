/* Service worker: cachea la app para que funcione sin internet. */

const CACHE = 'mi-ciclo-v5';
const ASSETS = [
  'index.html',
  'css/styles.css',
  'js/util.js',
  'js/storage.js',
  'js/predict.js',
  'js/security.js',
  'js/drive.js',
  'js/reminders.js',
  'js/report.js',
  'js/calendar.js',
  'js/views.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-maskable.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first: rápido y offline. Los datos del usuario viven en localStorage,
// no dependen de la red.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Deja pasar peticiones a otros orígenes (Google Drive/Identity) sin tocarlas.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});

// Minimal service worker — exists mainly to satisfy PWA installability
// requirements (Chrome/Edge require a registered SW with a fetch handler).
// It does NOT cache API responses, so task/project data is always fresh;
// it only provides an offline fallback for the app shell itself.

const CACHE_NAME = 'oyint-workspace-v1';
const SHELL_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // never intercept API calls

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL_URL))
    );
  }
});

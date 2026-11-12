// Minimal service worker — exists mainly to satisfy PWA installability
// requirements (Chrome/Edge require a registered SW with a fetch handler).
// It caches nothing: pages, scripts and API data always come from the network.

const CACHE_NAME = 'oyint-workspace-v4';   // bumped so 'activate' deletes the stale v3 shell

self.addEventListener('install', () => {
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

  // Pages always come from the network. The old offline fallback served a cached copy of '/'
  // that pointed at an earlier build's scripts; once those were gone the page stuck on
  // "Loading workspace..." forever (e.g. on a flaky or filtering office network).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
  }
});

// Clicking a reminder pop-up brings the workspace back to the front (or opens it)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      return win ? win.focus() : self.clients.openWindow('/');
    })
  );
});

// public/sw.js
// Minimal service worker.
// Its existence + the fetch listener are what make the PWA installable
// in Chrome/Edge/Android.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Network passthrough. The listener must exist for installability.
});
// src/pwa/registerSw.ts

/**
 * Where the service worker lives on your private/public repo.
 * Replace with your own jsDelivr URL.
 */
const REMOTE_SW_URL =
  'https://cdn.jsdelivr.net/gh/<user>/<repo>@main/butter-hub/sw.js';

const FALLBACK_SW_SOURCE = `
  self.addEventListener('install', (e) => { self.skipWaiting(); });
  self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
  self.addEventListener('fetch', (e) => { /* passthrough */ });
`;

export const registerInlineServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const isSecure =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';
  if (!isSecure) return;

  // 1. Try to fetch the hosted worker source.
  let source = FALLBACK_SW_SOURCE;
  try {
    const res = await fetch(REMOTE_SW_URL, { cache: 'no-cache' });
    if (res.ok) {
      const text = await res.text();
      if (text.trim().length > 0) source = text;
    }
  } catch (err) {
    console.warn(
      '[pwa] remote sw fetch failed, using inline fallback:',
      err,
    );
  }

  // 2. Re-serve from a same-origin blob URL.
  try {
    const blob = new Blob([source], {
      type: 'application/javascript',
    });
    const blobUrl = URL.createObjectURL(blob);

    await navigator.serviceWorker.register(blobUrl, { scope: './' });
  } catch (err) {
    console.warn('[pwa] service worker registration failed:', err);
  }
};
// src/pwa/registerSw.ts

/**
 * Registers the same-origin service worker.
 * On Cloudflare Pages, `sw.js` is served at the root of the deployed
 * site, so `new URL('sw.js', document.baseURI)` resolves correctly.
 */
export const registerInlineServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const isSecure =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';
  if (!isSecure) return;

  const swUrl = new URL('sw.js', document.baseURI).href;

  try {
    await navigator.serviceWorker.register(swUrl, { scope: './' });
  } catch (err) {
    console.warn('[pwa] service worker registration failed:', err);
  }
};
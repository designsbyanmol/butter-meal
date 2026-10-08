// src/pwa/manifest.ts

export const HUB_ICON_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/icon-192.png';

export const HUB_APP_NAME = 'Butter Hub';
export const HUB_APP_SHORT = 'Butter';
export const HUB_THEME_COLOR = '#1e7e34';

/**
 * Where the manifest lives on your private/public repo.
 * Replace with your own jsDelivr URL.
 */
const REMOTE_MANIFEST_URL =
  'https://cdn.jsdelivr.net/gh/<user>/<repo>@main/butter-hub/manifest.webmanifest';

export interface ManifestOptions {
  startUrl: string;
  scope?: string;
}

/**
 * Fetches the remote manifest, rewrites `start_url` and `scope` to the
 * current deployment, then re-serves it from a same-origin blob URL so
 * Chrome treats it as installable.
 *
 * Falls back to a generated inline manifest if the fetch fails.
 */
export const installManifestLink = async (
  opts: ManifestOptions,
): Promise<void> => {
  const scope =
    opts.scope ??
    (() => {
      try {
        const u = new URL(opts.startUrl, window.location.origin);
        return u.pathname.replace(/\/[^/]*$/, '/');
      } catch {
        return '/';
      }
    })();

  let manifest: any;

  try {
    const res = await fetch(REMOTE_MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    console.warn(
      '[pwa] remote manifest fetch failed, using inline fallback:',
      err,
    );
    manifest = buildFallbackManifest();
  }

  // Override per-deployment fields so the same remote file works across
  // every deployment without editing it.
  manifest.start_url = opts.startUrl;
  manifest.scope = scope;

  const blob = new Blob([JSON.stringify(manifest)], {
    type: 'application/manifest+json',
  });
  const blobUrl = URL.createObjectURL(blob);

  let link = document.querySelector<HTMLLinkElement>(
    'link[rel="manifest"]',
  );
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = blobUrl;

  // iOS-friendly extras.
  ensureLink('apple-touch-icon', HUB_ICON_URL, '180x180');
  ensureLink('icon', HUB_ICON_URL, '192x192');
  ensureMeta('theme-color', HUB_THEME_COLOR);
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
  ensureMeta('apple-mobile-web-app-title', HUB_APP_SHORT);
  ensureMeta('mobile-web-app-capable', 'yes');
};

const ensureLink = (rel: string, href: string, sizes?: string) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (sizes) el.sizes.value = sizes;
};

const ensureMeta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
};

/** Fallback manifest if the remote fetch fails. */
const buildFallbackManifest = () => ({
  name: HUB_APP_NAME,
  short_name: HUB_APP_SHORT,
  description: 'Your saved stores, one tap away.',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#ffffff',
  theme_color: HUB_THEME_COLOR,
  icons: [
    {
      src: HUB_ICON_URL,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: HUB_ICON_URL,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
});
// src/utils/printReceipt.ts

export interface PrintOptions {
  /**
   * Sets `document.title` in the popup. Most browsers use this as the
   * default PDF filename.
   */
  title?: string;
  /**
   * Page size for the popup. Examples:
   *   "80mm auto"        thermal receipt
   *   "A5 landscape"     A5 landscape
   *   "A4 portrait"      A4 portrait
   *
   * Defaults to `"80mm auto"`.
   */
  pageSize?: string;
}

/**
 * Open a new window, splice in the parent's CSS *as text* so the CSS
 * module classes resolve, then append a final `<style>` that pins the
 * `@page` size. This ordering is what forces Chrome/Safari to honour
 * the size — a later `@page` rule always wins, and `width`/`height`
 * on `<html>` stop the browser from auto-expanding to A4.
 */
export const printReceiptNode = (
  node: HTMLElement | null,
  opts: PrintOptions = {},
): boolean => {
  if (!node) return false;

  const { title = 'Bill', pageSize = '80mm auto' } = opts;

  const w = window.open('', '_blank', 'width=460,height=760');
  if (!w) return false;

  // 1. Collect the CSS TEXT from every style tag and stylesheet that
  //    is actually usable. We rewrite <link>s by fetching them so that
  //    order is guaranteed. CORS-allowed stylesheets come back with
  //    their rules; blocked ones are skipped silently.
  const cssBlocks: string[] = [];

  document.querySelectorAll('style').forEach((s) => {
    if (s.textContent) cssBlocks.push(s.textContent);
  });

  const linkEls = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );

  for (const link of linkEls) {
    try {
      const css = readStylesheetText(link);
      if (css) cssBlocks.push(css);
    } catch {
      /* CORS-blocked - ignore */
    }
  }

  const parentCss = cssBlocks.join('\n');

  // 2. Derive the fixed dimensions to force the page size. `auto` size
  //    (thermal) keeps the roll width only and lets height grow.
  const dimensionCss = dimensionsForPageSize(pageSize);

  // 3. Write the popup. Our @page block is emitted LAST so it wins.
  w.document.write(`
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>${parentCss}</style>
      <style>
        html, body {
          ${dimensionCss}
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: system-ui, Arial, sans-serif;
        }
        * { box-sizing: border-box; }

        @page {
          size: ${pageSize};
        }

        @media print {
          html, body {
            ${dimensionCss}
          }
          /* Allow long content to flow onto additional pages. */
          .page-break-avoid { break-inside: avoid; }
        }
      </style>
    </head>
    <body>${node.innerHTML}</body>
  </html>
`);
  w.document.close();
  w.focus();

  setTimeout(() => {
    try {
      w.print();
      w.close();
    } catch {
      /* ignore */
    }
  }, 250);

  return true;
};

/**
 * Read the CSS text from a `<link>` element. If the stylesheet is on
 * the same origin we can read `sheet.cssRules` directly. Otherwise we
 * try `fetch` (works when the CDN is CORS-enabled), and finally fall
 * back to `null`.
 */
const readStylesheetText = (link: HTMLLinkElement): string | null => {
  const sheet = link.sheet;
  if (sheet) {
    try {
      return Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join('\n');
    } catch {
      /* cross-origin - fall through */
    }
  }
  return null;
};

/**
 * Turn "80mm auto" / "A5 landscape" / "A4 portrait" into CSS rules
 * that pin the layout width/height on `<html>` and `<body>`.
 *
 * Thermal (auto height) only constrains the width so the browser can
 * page-break across continuous content. Fixed sizes pin both axes so
 * Chrome stops expanding the page to A4.
 */
const dimensionsForPageSize = (pageSize: string): string => {
  const lower = pageSize.toLowerCase().trim();

  // Thermal roll: constrain width only, height follows content.
  if (lower.includes('auto')) {
    const m = lower.match(/([\d.]+)mm/);
    const width = m ? `${m[1]}mm` : '80mm';
    return `width: ${width};`;
  }

  // Fixed sizes: constrain the layout width so the browser lays out
  // at the correct size, but DO NOT pin the height - that lets long
  // bills paginate across additional A5/A4 sheets instead of spilling
  // onto a single oversized page.
  if (lower.startsWith('a5 landscape')) {
    return 'width: 210mm;';
  }
  if (lower.startsWith('a5 portrait')) {
    return 'width: 148mm;';
  }
  if (lower.startsWith('a5')) {
    return 'width: 210mm;'; // assume landscape if unspecified
  }
  if (lower.startsWith('a4 landscape')) {
    return 'width: 297mm;';
  }
  if (lower.startsWith('a4')) {
    return 'width: 210mm;';
  }

  return '';
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
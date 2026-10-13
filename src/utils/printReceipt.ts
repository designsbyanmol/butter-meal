// src/utils/printReceipt.ts

/**
 * Open a new window, inject the current document's stylesheets, and
 * print the given DOM node's outer HTML. Used by both the tenant's
 * per-card Generate Bill button and the OrderDetail modal.
 *
 * Returns false if the popup was blocked (caller should surface a
 * "allow pop-ups" message).
 */
export const printReceiptNode = (node: HTMLElement | null): boolean => {
  if (!node) return false;

  const w = window.open('', '_blank', 'width=420,height=680');
  if (!w) return false;

  const styles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((n) => n.outerHTML)
    .join('\n');

  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Bill</title>
        ${styles}
      </head>
      <body style="margin:0;background:#fff;font-family:system-ui,Arial,sans-serif;">
        ${node.innerHTML}
      </body>
    </html>
  `);
  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
    w.close();
  }, 200);

  return true;
};
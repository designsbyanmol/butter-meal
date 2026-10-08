// src/utils/credentialsPdf.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface CredentialsPdfPayload {
  storeName: string;
  publicUrl: string;
  adminUrl: string;
  phone: string;
  password: string;
  planName: string;
  months: number;
  expiresAt: string;   // human-readable, e.g. "12 Jan 2026"
  generatedAt?: string;
}

const escapeHtml = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'credentials';

export const downloadCredentialsPdf = async (
  payload: CredentialsPdfPayload,
): Promise<void> => {
  const {
    storeName,
    publicUrl,
    adminUrl,
    phone,
    password,
    planName,
    months,
    expiresAt,
    generatedAt,
  } = payload;

  const gen =
    generatedAt ??
    new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  // ---------------------------------------------------------
  // 1. Build the styled HTML
  //
  //    Note the two URL sections below - instead of showing the URL
  //    as text, each is a big styled "button" with a label and a
  //    chevron. We tag them with `data-pdf-link` so the PDF builder
  //    can find them and register a link annotation on the exact
  //    rectangle they occupy.
  // ---------------------------------------------------------
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-10000px';
  holder.style.top = '0';
  holder.style.width = '794px'; // A4 @ 96dpi
  holder.style.background = '#ffffff';
  holder.style.zIndex = '-1';
  holder.setAttribute('aria-hidden', 'true');

  holder.innerHTML = `
    <div id="pdf-root" style="
      width: 794px;
      box-sizing: border-box;
      padding: 48px 56px 40px;
      font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #1e1e1e;
      background: #ffffff;
      position: relative;
      overflow: hidden;
    ">
      <!-- Top accent bar -->
      <div style="
        position: absolute;
        inset: 0 0 auto 0;
        height: 8px;
        background: linear-gradient(90deg, #3caa46 0%, #1e7e34 55%, #064a16 100%);
      "></div>

      <!-- Header -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 4px;
        margin-bottom: 28px;
      ">
        <div>
          <div style="
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.4px;
            color: #1e1e1e;
          ">${escapeHtml(storeName)}</div>
          <div style="
            margin-top: 4px;
            font-size: 12.5px;
            color: #7d6b60;
            letter-spacing: 0.2px;
          ">Account Credentials · Store Login Details</div>
        </div>
        <div style="
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #1e7e34;
          background: #e6f5e9;
          border: 1px solid #d1ead6;
          padding: 6px 12px;
          border-radius: 999px;
        ">Confidential</div>
      </div>

      <!-- Plan summary -->
      <div style="display: flex; gap: 10px; margin-bottom: 22px;">
        <div style="
          flex: 1;
          padding: 14px 16px;
          background: #f4fbf5;
          border: 1px solid #d1ead6;
          border-radius: 10px;
        ">
          <div style="
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #6a6a6a;
            margin-bottom: 4px;
          ">Plan</div>
          <div style="font-size: 15px; font-weight: 700; color: #1e1e1e;">
            ${escapeHtml(planName)}
            <span style="font-size: 12px; font-weight: 500; color: #6a6a6a; margin-left: 6px;">
              · ${months} month${months > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style="
          flex: 1;
          padding: 14px 16px;
          background: #fff8e1;
          border: 1px solid #fde68a;
          border-radius: 10px;
        ">
          <div style="
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #6a6a6a;
            margin-bottom: 4px;
          ">Valid till</div>
          <div style="font-size: 15px; font-weight: 700; color: #1e1e1e;">
            ${escapeHtml(expiresAt)}
          </div>
        </div>
      </div>

      <!-- Login credentials block (phone + password) -->
      <div style="
        border: 1px solid #e4e4e4;
        border-radius: 12px;
        padding: 4px 20px;
        margin-bottom: 20px;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #f0ebe6;
        ">
          <div style="
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #6a6a6a;
          ">Login Phone</div>
          <div style="
            font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
            font-size: 15px;
            font-weight: 700;
            color: #1e1e1e;
            letter-spacing: 0.5px;
          ">+91 ${escapeHtml(phone)}</div>
        </div>

        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
        ">
          <div style="
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #6a6a6a;
          ">Password</div>
          <div style="
            font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
            font-size: 15px;
            font-weight: 700;
            color: #1e7e34;
            letter-spacing: 1px;
            background: #f4fbf5;
            border: 1px dashed #a8d9b1;
            padding: 6px 12px;
            border-radius: 6px;
          ">${escapeHtml(password)}</div>
        </div>
      </div>

      <!-- Two big URL buttons (side by side) -->
      <div style="display: flex; gap: 12px; margin-bottom: 22px;">

        <!-- Admin Store button -->
        <div
          data-pdf-link="admin"
          data-pdf-url="${escapeHtml(adminUrl)}"
          style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 14px 18px;
            background: linear-gradient(135deg, #3caa46 0%, #1e7e34 100%);
            color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(30, 126, 52, 0.22);
            cursor: pointer;
          "
        >
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="
              font-size: 10.5px;
              font-weight: 700;
              letter-spacing: 0.6px;
              text-transform: uppercase;
              opacity: 0.85;
            ">Admin Store</div>
            <div style="
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.2px;
            ">Sign in to manage</div>
          </div>
          <div style="
            font-size: 20px;
            font-weight: 800;
            line-height: 1;
            opacity: 0.9;
          ">&rsaquo;</div>
        </div>

        <!-- Public Store button -->
        <div
          data-pdf-link="public"
          data-pdf-url="${escapeHtml(publicUrl)}"
          style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 14px 18px;
            background: #ffffff;
            color: #1e1e1e;
            border: 1.5px solid #1e7e34;
            border-radius: 10px;
            cursor: pointer;
          "
        >
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="
              font-size: 10.5px;
              font-weight: 700;
              letter-spacing: 0.6px;
              text-transform: uppercase;
              color: #1e7e34;
            ">Public Store</div>
            <div style="
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.2px;
            ">Share with customers</div>
          </div>
          <div style="
            font-size: 20px;
            font-weight: 800;
            line-height: 1;
            color: #1e7e34;
          ">&rsaquo;</div>
        </div>

      </div>

      <!-- Notes -->
      <div style="
        padding: 14px 16px;
        background: #fbfbfb;
        border-left: 4px solid #3caa46;
        border-radius: 6px;
        margin-bottom: 26px;
      ">
        <div style="
          font-size: 12px;
          font-weight: 700;
          color: #1e1e1e;
          margin-bottom: 6px;
        ">Notes</div>
        <ul style="
          margin: 0;
          padding-left: 18px;
          font-size: 11.5px;
          color: #4d4d4d;
          line-height: 1.55;
        ">
          <li>Click the two buttons above to open the store URLs directly from this PDF.</li>
          <li>Keep these credentials safe - do not share them with anyone.</li>
          <li>Change your password after the first login if you wish.</li>
          <li><strong>Admin URL</strong> is where you sign in to manage your store. <strong>Public URL</strong> is what you share with customers.</li>
        </ul>
      </div>

      <!-- Footer -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 16px;
        border-top: 1px solid #f0ebe6;
        font-size: 10.5px;
        color: #a6a6a6;
      ">
        <div>Generated: ${escapeHtml(gen)}</div>
        <div>- Butter Meal</div>
      </div>
    </div>
  `;

  document.body.appendChild(holder);

  try {
    // ---------------------------------------------------------
    // 2. Render the HTML to a canvas
    // ---------------------------------------------------------
    const root = holder.querySelector('#pdf-root') as HTMLElement;
    const canvas = await html2canvas(root, {
      backgroundColor: '#ffffff',
      scale: 2, // crisper text and buttons
      useCORS: true,
      logging: false,
    });

    // ---------------------------------------------------------
    // 3. Compute the (x, y, w, h) of each [data-pdf-link] element
    //    relative to the canvas root, in canvas pixels, then scale
    //    to PDF points using the same scale factor the image is
    //    drawn at.
    // ---------------------------------------------------------
    const rootRect = root.getBoundingClientRect();
    const canvasScale = canvas.width / rootRect.width;

    const linkBoxes: {
      url: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }[] = [];

    root
      .querySelectorAll<HTMLElement>('[data-pdf-link]')
      .forEach((el) => {
        const url = el.getAttribute('data-pdf-url') || '';
        if (!url) return;

        const r = el.getBoundingClientRect();
        linkBoxes.push({
          url,
          x: (r.left - rootRect.left) * canvasScale,
          y: (r.top - rootRect.top) * canvasScale,
          w: r.width * canvasScale,
          h: r.height * canvasScale,
        });
      });

    // ---------------------------------------------------------
    // 4. Compose the PDF
    // ---------------------------------------------------------
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();   // 595.28
    const pageHeight = pdf.internal.pageSize.getHeight(); // 841.89

    // Fit the canvas to the page width, keep aspect ratio.
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // If the content is taller than the page we scale down to fit.
    const fitScale =
      imgHeight <= pageHeight ? 1 : pageHeight / imgHeight;

    const drawWidth = imgWidth * fitScale;
    const drawHeight = imgHeight * fitScale;

    // Offsets in case we ever want to center the drawing on the page.
    const drawX = (pageWidth - drawWidth) / 2;
    const drawY = 0;

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    // ---------------------------------------------------------
    // 5. Register the link annotations.
    //    Coordinates we captured are in canvas pixels; scale them
    //    to PDF points using the same `imgWidth / canvas.width`
    //    factor (times fitScale, in case we shrank the image).
    // ---------------------------------------------------------
    const pxToPt = (imgWidth / canvas.width) * fitScale;

    linkBoxes.forEach(({ url, x, y, w, h }) => {
      pdf.link(
        drawX + x * pxToPt,
        drawY + y * pxToPt,
        w * pxToPt,
        h * pxToPt,
        { url },
      );
    });

    // ---------------------------------------------------------
    // 6. Save
    // ---------------------------------------------------------
    pdf.save(`${slugify(storeName)}-credentials.pdf`);
  } finally {
    holder.remove();
  }
};
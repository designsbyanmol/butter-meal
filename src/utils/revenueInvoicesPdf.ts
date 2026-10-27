// src/utils/revenueInvoicesPdf.ts
import jsPDF from 'jspdf';

export interface RevenueInvoicePdfRow {
  id: string;
  tenant_slug: string;
  tenant_name: string;
  plan_id: string;
  months: number;
  base_amount: number;
  final_amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  created_at: string;
  paid_at: string | null;
  subscription_expires_at?: string | null;
}

export interface RevenueInvoicePdfPayload {
  storeName: string;
  /** Human label used only as a fallback when the ISO dates aren't supplied. */
  rangeLabel: string;
  /** Real filter range - used to render "01 Oct 2026 → 22 Oct 2026". */
  fromDateIso?: string | null;
  toDateIso?: string | null;
  rows: RevenueInvoicePdfRow[];
  totalRevenue: number;
  statusLabel: string;
  /** ISO timestamp of generation. Reused on every page. */
  generatedAt?: string;
}

// =========================================================
// Header logo
// =========================================================
const HEADER_LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp';

interface DecodedLogo {
  dataUrl: string;
  width: number;
  height: number;
}

const fetchImageAsPngDataUrl = async (
  url: string,
): Promise<DecodedLogo | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();

    const dataUrl = await new Promise<string | null>((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objUrl);
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const png = canvas.toDataURL('image/png');
          URL.revokeObjectURL(objUrl);
          resolve(png);
        } catch {
          URL.revokeObjectURL(objUrl);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
      img.src = objUrl;
    });

    if (!dataUrl) return null;

    const dims = await new Promise<{ width: number; height: number } | null>(
      (resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      },
    );

    if (!dims || dims.width === 0 || dims.height === 0) return null;

    return { dataUrl, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
};

// =========================================================
// Colours
// =========================================================
const TEXT: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const TEXT_FAINT: [number, number, number] = [160, 160, 160];
const GREEN_SOFT: [number, number, number] = [244, 251, 245];
const GREEN_DARK: [number, number, number] = [30, 126, 52];
const ZEBRA: [number, number, number] = [241, 245, 249];

// =========================================================
// Layout
// =========================================================
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const HEADER_LOGO_MAX_W = 110;
const HEADER_LOGO_MAX_H = 26;

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const fmtDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = d
      .toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();
    return `${dateStr}, ${timeStr}`;
  } catch {
    return iso;
  }
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'invoices';

// =========================================================
// Main
// =========================================================
export const downloadRevenueInvoicesPdf = async (
  payload: RevenueInvoicePdfPayload,
): Promise<void> => {
  const {
    storeName,
    rangeLabel,
    fromDateIso,
    toDateIso,
    rows,
    totalRevenue,
    statusLabel,
    generatedAt,
  } = payload;

  // One timestamp captured at generation time, reused on every page.
  const generatedIso = generatedAt ?? new Date().toISOString();

  // Resolve the actual range string for the header.
  const headerRange = (() => {
  if (fromDateIso || toDateIso) {
    const fromStr = fromDateIso ? fmtDate(fromDateIso) : '-';
    const toStr = toDateIso ? fmtDate(toDateIso) : 'Present';
    return `${fromStr} to ${toStr}`;
  }
  return rangeLabel;
})();

  const headerLogo = await fetchImageAsPngDataUrl(HEADER_LOGO_URL);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  const drawHeader = (topY: number): number => {
    if (headerLogo) {
      const scale = Math.min(
        HEADER_LOGO_MAX_W / headerLogo.width,
        HEADER_LOGO_MAX_H / headerLogo.height,
      );
      const drawW = headerLogo.width * scale;
      const drawH = headerLogo.height * scale;
      pdf.addImage(
        headerLogo.dataUrl,
        'PNG',
        MARGIN,
        topY,
        drawW,
        drawH,
      );
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...TEXT);
    pdf.text(storeName.toUpperCase(), PAGE_W - MARGIN, topY + 24, {
      align: 'right',
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_FAINT);
    pdf.text(
      'Platform Invoices . Revenue Report',
      PAGE_W - MARGIN,
      topY + 40,
      { align: 'right' },
    );

    return topY + Math.max(HEADER_LOGO_MAX_H, 30) + 14;
  };

  // ---------------------------------------------------------
  // Footer - left: generated timestamp. Right: page counter.
  // No divider, no text in the middle.
  // ---------------------------------------------------------
  const drawFooter = (pageNum: number, total: number) => {
    const footerY = PAGE_H - MARGIN;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_FAINT);

    // Left: generated timestamp
    pdf.text(`Generated ${fmtDateTime(generatedIso)}`, MARGIN, footerY);

    // Right: page counter
    pdf.text(
      `Page ${pageNum} of ${total}`,
      PAGE_W - MARGIN,
      footerY,
      { align: 'right' },
    );
  };

  // ---------------------------------------------------------
  // Page 1
  // ---------------------------------------------------------
  let y = MARGIN;
  y = drawHeader(y);

  // Range / status line (now uses the actual date range)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT);
  pdf.text(
    `Range: ${headerRange} . Status: ${statusLabel}`,
    MARGIN,
    y,
  );
  y += 28;

  // =========================================================
  // Summary banner
  // =========================================================
  const bannerH = 56;
  pdf.setFillColor(...GREEN_SOFT);
  pdf.setDrawColor(209, 234, 214);
  pdf.roundedRect(MARGIN, y, CONTENT_W, bannerH, 6, 6, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...GREEN_DARK);
  pdf.text('TOTAL REVENUE (IN RANGE)', MARGIN + 14, y + 20);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...TEXT);
  pdf.text(rupees(Math.round(totalRevenue)), MARGIN + 14, y + 44);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(
    `${rows.length} invoice${rows.length === 1 ? '' : 's'}`,
    MARGIN + CONTENT_W - 14,
    y + 34,
    { align: 'right' },
  );

  y += bannerH + 18;

  // =========================================================
  // Columns
  // =========================================================
  const colSnW = 20;
  const colDateW = 62;
  const colStoreW = 110;
  const colPlanW = 82;
  const colAmountW = 72;
  const colExpiryW = 62;
  const colStatusW = 60;
  const sumCols =
    colSnW +
    colDateW +
    colStoreW +
    colPlanW +
    colAmountW +
    colExpiryW +
    colStatusW;
  const storeExtraW = Math.max(0, CONTENT_W - sumCols);

  const xSn = MARGIN;
  const xDate = xSn + colSnW;
  const xStore = xDate + colDateW;
  const xPlan = xStore + colStoreW + storeExtraW;
  const xAmountRight = xPlan + colPlanW + colAmountW;
  const xExpiryRight = xAmountRight + colExpiryW;
  const xStatusRight = xExpiryRight + colStatusW;

  const headerRowH = 22;

  const drawTableHeader = (topY: number): number => {
    pdf.setFillColor(...ZEBRA);
    pdf.rect(MARGIN, topY, CONTENT_W, headerRowH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_MUTED);
    const hY = topY + 14;
    pdf.text('#', xSn + 6, hY);
    pdf.text('DATE', xDate, hY);
    pdf.text('STORE', xStore, hY);
    pdf.text('PLAN', xPlan, hY);
    pdf.text('AMOUNT', xAmountRight, hY, { align: 'right' });
    pdf.text('EXPIRES', xExpiryRight, hY, { align: 'right' });
    pdf.text('STATUS', xStatusRight, hY, { align: 'right' });

    return topY + headerRowH + 6;
  };

  y = drawTableHeader(y);

  // =========================================================
  // Rows
  // =========================================================
  const rowH = 18;
  const bottomLimit = PAGE_H - MARGIN - 40;
  let rowIndex = 0;
  let rowBandIndex = 0;

  for (const r of rows) {
    if (y > bottomLimit) {
      pdf.addPage();
      y = MARGIN;

      y = drawHeader(y);
      y = drawTableHeader(y);

      rowBandIndex = 0;
    }

    rowIndex += 1;

    if (rowBandIndex % 2 === 1) {
      pdf.setFillColor(...ZEBRA);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    }

    const textBaseline = y + 12;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);

    pdf.text(String(rowIndex), xSn + 6, textBaseline);
    pdf.text(fmtDate(r.created_at), xDate, textBaseline);

    const storeLabel = r.tenant_name || r.tenant_slug || 'Store';
    const storeCut = pdf.splitTextToSize(
      storeLabel,
      colStoreW + storeExtraW - 6,
    )[0];
    pdf.text(storeCut, xStore, textBaseline);

    const planLabel = `${r.plan_id} . ${r.months}mo`;
    const planCut = pdf.splitTextToSize(planLabel, colPlanW - 6)[0];
    pdf.text(planCut, xPlan, textBaseline);

    pdf.text(rupees(r.final_amount), xAmountRight, textBaseline, {
      align: 'right',
    });

    pdf.text(
      fmtDate(r.subscription_expires_at),
      xExpiryRight,
      textBaseline,
      { align: 'right' },
    );

    if (r.status === 'paid') {
      pdf.setTextColor(...GREEN_DARK);
    } else if (r.status === 'pending') {
      pdf.setTextColor(153, 96, 0);
    } else {
      pdf.setTextColor(166, 45, 45);
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(r.status.toUpperCase(), xStatusRight, textBaseline, {
      align: 'right',
    });

    y += rowH;
    rowBandIndex += 1;
  }

  // =========================================================
  // Footers
  // =========================================================
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawFooter(p, totalPages);
  }

  pdf.save(`${slugify(storeName)}-invoices-${Date.now()}.pdf`);
};
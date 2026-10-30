// src/utils/storeHistoryPdf.ts
import jsPDF from 'jspdf';

export interface StoreHistoryRow {
  id: string;
  billNo: string;
  customerName?: string;
  phone?: string;
  address?: string;
  items: any[];
  subtotal: number;
  discount: number;
  additionalDiscountPct?: number;
  additionalDiscount?: number;
  gstPercent?: number;
  gstAmount?: number;
  taxableValue?: number;
  finalAmount: number;
  createdAt: string;
}

export interface StoreHistoryPdfPayload {
  rows: StoreHistoryRow[];
  storeName: string;
  fromIso: string | null;
  toIso: string | null;
  generatedAt?: string;
}

// ---------- Brand logo ----------
const FOOTER_LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp';
const HEADER_LOGO_MAX_W = 80;

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

const TEXT: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const TEXT_FAINT: [number, number, number] = [160, 160, 160];
const GREEN_SOFT: [number, number, number] = [244, 251, 245];
const GREEN_DARK: [number, number, number] = [30, 126, 52];
const BORDER_SOFT: [number, number, number] = [240, 240, 240];
const ZEBRA: [number, number, number] = [248, 250, 252];

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};

const fmtRangeDate = (iso: string | null, fallback = '—'): string => {
  if (!iso) return fallback;
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fallback;
  }
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'history';

export const downloadStoreHistoryPdf = async (
  payload: StoreHistoryPdfPayload,
): Promise<void> => {
  const { rows, storeName, fromIso, toIso, generatedAt } = payload;
  const gen = generatedAt ?? new Date().toISOString();

  const headerLogo = await fetchImageAsPngDataUrl(FOOTER_LOGO_URL);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  let y = MARGIN;

  // ---------- Header ----------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...TEXT);
  pdf.text(storeName.toUpperCase(), MARGIN, y + 6);

  if (headerLogo) {
    const scale = Math.min(1, HEADER_LOGO_MAX_W / headerLogo.width);
    const drawW = headerLogo.width * scale;
    const drawH = headerLogo.height * scale;
    const logoX = PAGE_W - MARGIN - drawW;
    const logoY = y - 8;
    pdf.addImage(headerLogo.dataUrl, 'PNG', logoX, logoY, drawW, drawH);
  }

  y += 22;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Bill History', MARGIN, y);
  y += 16;

  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text(
    `Period: ${fmtRangeDate(fromIso)} - ${fmtRangeDate(toIso, 'Present')}`,
    MARGIN,
    y,
  );
  y += 22;

  // ---------- Summary ----------
  const totalRevenue = rows.reduce(
    (s, r) => s + (Number(r.finalAmount) || 0),
    0,
  );
  const totalGst = rows.reduce(
    (s, r) => s + (Number(r.gstAmount) || 0),
    0,
  );

  const bannerH = 64;
  pdf.setFillColor(...GREEN_SOFT);
  pdf.setDrawColor(209, 234, 214);
  pdf.roundedRect(MARGIN, y, CONTENT_W, bannerH, 6, 6, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...GREEN_DARK);
  pdf.text('TOTAL SALE', MARGIN + 16, y + 20);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...TEXT);
  pdf.text(rupees(Math.round(totalRevenue)), MARGIN + 16, y + 46);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(
    `${rows.length} bill${rows.length === 1 ? '' : 's'}`,
    MARGIN + CONTENT_W - 16,
    y + 28,
    { align: 'right' },
  );
  pdf.text(
    `GST collected: ${rupees(Math.round(totalGst))}`,
    MARGIN + CONTENT_W - 16,
    y + 46,
    { align: 'right' },
  );

  y += bannerH + 20;

  // ---------- Columns ----------
  const colSn       = 26;
  const colDate     = 72;
  const colBill     = 84;
  const colCustomer = 140;
  const colItems    = 40;
  const colAmount   = 72;

  const sum =
    colSn + colDate + colBill + colCustomer + colItems + colAmount;
  const extra = Math.max(0, CONTENT_W - sum);

  const xSn       = MARGIN;
  const xDate     = xSn + colSn;
  const xBill     = xDate + colDate;
  const xCustomer = xBill + colBill;
  const xItems    = xCustomer + colCustomer + extra;
  const xAmount   = xItems + colItems;

  const headerRowH = 24;

  const drawTableHeader = (topY: number): number => {
    pdf.setFillColor(...ZEBRA);
    pdf.rect(MARGIN, topY, CONTENT_W, headerRowH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_MUTED);
    const base = topY + 15;
    pdf.text('#', xSn + 6, base);
    pdf.text('DATE', xDate, base);
    pdf.text('BILL NO', xBill, base);
    pdf.text('CUSTOMER', xCustomer, base);
    pdf.text('ITEMS', xItems, base);
    pdf.text('AMOUNT', xAmount, base);

    return topY + headerRowH + 8;
  };

  y = drawTableHeader(y);

  // ---------- Rows ----------
  const LINE_H = 11;
  const ROW_PAD = 5;
  const bottomLimit = PAGE_H - MARGIN - 40;

  let idx = 0;
  let zebraIndex = 0;

  for (const r of rows) {
    idx += 1;

    const nameStr = r.customerName?.trim() || '—';
    const phoneStr = r.phone?.trim() || '';
    const addrStr = r.address?.trim() || '';

    const nameLines = pdf.splitTextToSize(nameStr, colCustomer);
    const phoneLines = phoneStr
      ? pdf.splitTextToSize(phoneStr, colCustomer)
      : [];
    const addrLines = addrStr
      ? pdf.splitTextToSize(addrStr, colCustomer)
      : [];

    const customerBlockLines =
      nameLines.length + phoneLines.length + addrLines.length;
    const customerBlockH = customerBlockLines * LINE_H + ROW_PAD * 2;

    const rowH = Math.max(customerBlockH, 22);

    if (y + rowH > bottomLimit) {
      pdf.addPage();
      y = MARGIN;
      y = drawTableHeader(y);
      zebraIndex = 0;
    }

    if (zebraIndex % 2 === 1) {
      pdf.setFillColor(...ZEBRA);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    }

    const baseY = y + 14;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);

    pdf.text(String(idx), xSn + 6, baseY);
    pdf.text(fmtRangeDate(r.createdAt), xDate, baseY);
    pdf.text(r.billNo || '—', xBill, baseY);

    let cy = baseY;
    pdf.setFont('helvetica', 'bold');
    nameLines.forEach((ln: string) => {
      pdf.text(ln, xCustomer, cy);
      cy += LINE_H;
    });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...TEXT_MUTED);
    if (phoneStr) {
      phoneLines.forEach((ln: string) => {
        pdf.text(ln, xCustomer, cy);
        cy += LINE_H;
      });
    }
    if (addrStr) {
      pdf.setFontSize(8);
      pdf.setTextColor(...TEXT_FAINT);
      addrLines.forEach((ln: string) => {
        pdf.text(ln, xCustomer, cy);
        cy += LINE_H;
      });
    }
    pdf.setFontSize(9);

    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(String(r.items?.length || 0), xItems, baseY);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...TEXT);
    pdf.text(rupees(r.finalAmount), xAmount, baseY);

    y += rowH;
    zebraIndex += 1;

    pdf.setDrawColor(...BORDER_SOFT);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  }

  // ---------- Footers ----------
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    const footerY = PAGE_H - MARGIN;
    pdf.setDrawColor(...BORDER_SOFT);
    pdf.setLineWidth(0.6);
    pdf.line(MARGIN, footerY - 18, PAGE_W - MARGIN, footerY - 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_FAINT);
    pdf.text(`Generated ${fmtDateTime(gen)}`, MARGIN, footerY - 4);
    pdf.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, footerY - 4, {
      align: 'right',
    });
  }

  pdf.save(`${slugify(storeName)}-bills-${Date.now()}.pdf`);
};
// src/utils/pharmacyHistoryPdf.ts
import jsPDF from 'jspdf';

export interface PharmacyHistoryRow {
  id: string;
  bill_no: string;
  patient_name: string;
  phone?: string;
  address?: string;
  doctor_name?: string;
  items: any[];
  subtotal: number;
  discount: number;
  additional_discount_pct?: number;
  additional_discount?: number;
  gst_percent?: number;
  gst_amount?: number;
  taxable_value?: number;
  final_amount: number;
  created_at: string;
}

export interface PharmacyHistoryPdfPayload {
  rows: PharmacyHistoryRow[];
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

// ---------- Palette ----------
const TEXT: [number, number, number] = [17, 24, 39];
const TEXT_MUTED: [number, number, number] = [75, 85, 99];
const TEXT_FAINT: [number, number, number] = [148, 163, 184];
const ACCENT: [number, number, number] = [22, 101, 52];
const ACCENT_SOFT: [number, number, number] = [240, 253, 244];
const ACCENT_BORDER: [number, number, number] = [187, 247, 208];
const BORDER: [number, number, number] = [229, 231, 235];
const BORDER_SOFT: [number, number, number] = [241, 245, 249];
const ZEBRA: [number, number, number] = [248, 250, 252];

// ---------- Layout ----------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string | null | undefined, fallback = '—'): string => {
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

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso ?? '—';
  }
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'history';

export const downloadPharmacyHistoryPdf = async (
  payload: PharmacyHistoryPdfPayload,
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

  // =========================================================
  // Header
  // =========================================================
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 0, PAGE_W, 4, 'F');

  // Store name on the left.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...TEXT);
  pdf.text(storeName.toUpperCase(), MARGIN, y + 14);

  // Logo on the right.
  if (headerLogo) {
    const scale = Math.min(1, HEADER_LOGO_MAX_W / headerLogo.width);
    const drawW = headerLogo.width * scale;
    const drawH = headerLogo.height * scale;
    const logoX = PAGE_W - MARGIN - drawW;
    const logoY = y - 2;
    pdf.addImage(headerLogo.dataUrl, 'PNG', logoX, logoY, drawW, drawH);
  }

  y += 34;

  // Subtitle on the left.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Pharmacy Sales Report', MARGIN, y);

  y += 14;

  // Period date on the left, below the subtitle.
  const rangeLine = `${fmtDate(fromIso)} – ${fmtDate(toIso, 'Present')}`;
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text(`Period: ${rangeLine}`, MARGIN, y);

  y += 12;

  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);

  y += 16;

  // =========================================================
  // Summary banner
  // =========================================================
  const totalRevenue = rows.reduce(
    (s, r) => s + (Number(r.final_amount) || 0),
    0,
  );
  const totalGst = rows.reduce(
    (s, r) => s + (Number(r.gst_amount) || 0),
    0,
  );

  const bannerH = 64;
  pdf.setFillColor(...ACCENT_SOFT);
  pdf.setDrawColor(...ACCENT_BORDER);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(MARGIN, y, CONTENT_W, bannerH, 6, 6, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...ACCENT);
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

  // =========================================================
  // Table geometry
  // =========================================================
  const colSn = 26;
  const colDate = 72;
  const colBill = 84;
  const colPatient = 132;
  const colDoctor = 84;
  const colAmount = 66;

  const fixedSum =
    colSn +
    colDate +
    colBill +
    colPatient +
    colDoctor +
    colAmount;
  const slack = Math.max(0, CONTENT_W - fixedSum);

  const xSn = MARGIN;
  const xDate = xSn + colSn;
  const xBill = xDate + colDate;
  const xPatient = xBill + colBill;
  const xDoctor = xPatient + colPatient + slack;
  const xAmountR = xDoctor + colDoctor + colAmount;

  const headerRowH = 22;

  const drawTableHeader = (topY: number): number => {
    pdf.setFillColor(...ZEBRA);
    pdf.rect(MARGIN, topY, CONTENT_W, headerRowH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);

    const base = topY + 14;
    pdf.text('#', xSn + 5, base);
    pdf.text('DATE', xDate, base);
    pdf.text('BILL NO', xBill, base);
    pdf.text('PATIENT', xPatient, base);
    pdf.text('DOCTOR', xDoctor, base);
    pdf.text('AMOUNT', xAmountR, base, { align: 'right' });

    return topY + headerRowH + 6;
  };

  y = drawTableHeader(y);

  // =========================================================
  // Rows
  // =========================================================
  const LINE_H = 10.5;
  const ROW_PAD = 6;
  const bottomLimit = PAGE_H - MARGIN - 40;

  let rowIndex = 0;
  let zebra = 0;

  for (const r of rows) {
    rowIndex += 1;

    const nameStr = r.patient_name?.trim() || '—';
    const phoneStr = r.phone?.trim() || '';
    const addrStr = r.address?.trim() || '';

    const nameLines = pdf.splitTextToSize(nameStr, colPatient - 2);
    const phoneLines = phoneStr
      ? pdf.splitTextToSize(phoneStr, colPatient - 2)
      : [];
    const addrLines = addrStr
      ? pdf.splitTextToSize(addrStr, colPatient - 2)
      : [];

    const patientBlockLines =
      nameLines.length + phoneLines.length + addrLines.length;
    const patientBlockH = patientBlockLines * LINE_H + ROW_PAD * 2;

    const rowH = Math.max(patientBlockH, 26);

    if (y + rowH > bottomLimit) {
      pdf.addPage();

      pdf.setFillColor(...ACCENT);
      pdf.rect(0, 0, PAGE_W, 4, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(...TEXT);
      pdf.text(`${storeName.toUpperCase()} — continued`, MARGIN, MARGIN + 8);
      pdf.setDrawColor(...BORDER);
      pdf.setLineWidth(0.6);
      pdf.line(MARGIN, MARGIN + 16, PAGE_W - MARGIN, MARGIN + 16);

      y = MARGIN + 28;
      y = drawTableHeader(y);
      zebra = 0;
    }

    if (zebra % 2 === 1) {
      pdf.setFillColor(...ZEBRA);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    }

    const baseY = y + 15;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_FAINT);
    pdf.text(String(rowIndex), xSn + 5, baseY);

    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(fmtDate(r.created_at), xDate, baseY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);
    pdf.text(
      pdf.splitTextToSize(r.bill_no || '—', colBill - 2)[0] || '—',
      xBill,
      baseY,
    );

    let py = baseY;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);
    nameLines.forEach((ln: string) => {
      pdf.text(ln, xPatient, py);
      py += LINE_H;
    });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_MUTED);
    phoneLines.forEach((ln: string) => {
      pdf.text(ln, xPatient, py);
      py += LINE_H;
    });
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_FAINT);
    addrLines.forEach((ln: string) => {
      pdf.text(ln, xPatient, py);
      py += LINE_H;
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_MUTED);
    const docStr = r.doctor_name?.trim() || '—';
    const docCut =
      pdf.splitTextToSize(docStr, colDoctor - 2)[0] || '—';
    pdf.text(docCut, xDoctor, baseY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);
    pdf.text(
      rupees(Number(r.final_amount) || 0),
      xAmountR,
      baseY,
      { align: 'right' },
    );

    y += rowH;
    zebra += 1;

    pdf.setDrawColor(...BORDER_SOFT);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  }

  // =========================================================
  // Footers
  // =========================================================
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);

    const footerY = PAGE_H - MARGIN;
    pdf.setDrawColor(...BORDER_SOFT);
    pdf.setLineWidth(0.6);
    pdf.line(MARGIN, footerY - 16, PAGE_W - MARGIN, footerY - 16);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_FAINT);
    pdf.text(`Generated ${fmtDateTime(gen)}`, MARGIN, footerY - 4);
    pdf.text(
      `Page ${p} of ${totalPages}`,
      PAGE_W - MARGIN,
      footerY - 4,
      { align: 'right' },
    );
  }

  pdf.save(`${slugify(storeName)}-pharmacy-history-${Date.now()}.pdf`);
};
// src/utils/historyPdf.ts
import jsPDF from 'jspdf';
import { DineinOrder } from '../types';

export interface HistoryPdfPayload {
  orders: DineinOrder[];
  tenantName: string;
  rangeLabel: string;
  totalWithoutGst: number;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'history';

// ---------- Colors ----------
const TEXT: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const TEXT_FAINT: [number, number, number] = [160, 160, 160];
const BORDER: [number, number, number] = [220, 220, 220];
const BORDER_SOFT: [number, number, number] = [240, 240, 240];
const GREEN_SOFT: [number, number, number] = [244, 251, 245];
const GREEN_DARK: [number, number, number] = [30, 126, 52];

// ---------- Layout (A4 portrait, pt) ----------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDateTime = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
};

const paymentMode = (o: DineinOrder): string => {
  const ref = (o.paymentRef ?? '').toLowerCase();
  if (ref === 'online') return 'Online';
  if (ref === 'cash') return 'Cash';
  if (ref.startsWith('upi')) return 'Online';
  return 'Cash';
};

export const downloadHistoryPdf = (payload: HistoryPdfPayload): void => {
  const { orders, tenantName, rangeLabel, totalWithoutGst } = payload;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  let y = MARGIN;

  // =========================================================
  // Header
  // =========================================================
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...TEXT);
  pdf.text(tenantName.toUpperCase(), MARGIN, y + 6);
  y += 22;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Sales Report . Paid Orders', MARGIN, y);
  y += 16;

  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text(
    `Period: ${rangeLabel} . Generated ${new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })}`,
    MARGIN,
    y,
  );
  y += 22;

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
  pdf.text('TOTAL SALE (EXCL. GST)', MARGIN + 14, y + 20);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...TEXT);
  pdf.text(rupees(Math.round(totalWithoutGst)), MARGIN + 14, y + 42);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(
    `${orders.length} paid order${orders.length === 1 ? '' : 's'}`,
    MARGIN + CONTENT_W - 14,
    y + 34,
    { align: 'right' },
  );

  y += bannerH + 18;

  // =========================================================
  // Table header
  // =========================================================
  const colSnW = 26;
  const colOrderW = 70;
  const colModeW = 80;
  const colAmtW = 78;
  const colDateW =
    CONTENT_W - colSnW - colOrderW - colModeW - colAmtW;

  const xSn = MARGIN;
  const xOrder = xSn + colSnW;
  const xDate = xOrder + colOrderW;
  const xMode = xDate + colDateW;
  const xAmtRight = PAGE_W - MARGIN;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('#', xSn, y);
  pdf.text('ORDER ID', xOrder, y);
  pdf.text('DATE & TIME', xDate, y);
  pdf.text('MODE', xMode, y);
  pdf.text('AMOUNT', xAmtRight, y, { align: 'right' });
  y += 6;

  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;

  // =========================================================
  // Table rows
  // =========================================================
  const rowH = 16;
  const bottomY = PAGE_H - MARGIN - 30;

  orders.forEach((o, i) => {
    if (y > bottomY) {
      pdf.addPage();
      y = MARGIN;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT);

    pdf.text(String(i + 1), xSn, y);
    pdf.text(`#${o.orderNo}`, xOrder, y);
    pdf.text(fmtDateTime(o.createdAt), xDate, y);
    pdf.text(paymentMode(o), xMode, y);
    pdf.text(
  rupees(o.totalAmount - (o.staffTip ?? 0)),
  xAmtRight,
  y,
  { align: 'right' },
);

    y += rowH;

    pdf.setDrawColor(...BORDER_SOFT);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
  });

  // =========================================================
  // Footer on last page
  // =========================================================
  const footerY = PAGE_H - MARGIN;
  pdf.setDrawColor(...BORDER_SOFT);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, footerY - 20, PAGE_W - MARGIN, footerY - 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text('Generated by Butter Meal', MARGIN, footerY - 6);
  pdf.text(
    `Page ${pdf.getNumberOfPages()}`,
    PAGE_W - MARGIN,
    footerY - 6,
    { align: 'right' },
  );

  pdf.save(
    `${slugify(tenantName)}-sales-history-${Date.now()}.pdf`,
  );
};
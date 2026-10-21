// src/utils/billPdf.ts
import jsPDF from 'jspdf';
import { DineinOrder, DineinOrderItem } from '../types';

export interface BillTenantInfo {
  displayName: string;
  storeTagline?: string;
  gstPercent?: number;
}

/**
 * A consolidated bill line. Two source items collapse into one line
 * only if their name, customizations, and custom message match
 * exactly.
 */
export interface ConsolidatedBillLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customizations?: Record<string, string>;
  customMessage?: string;
}

export const consolidateItems = (
  items: DineinOrderItem[],
): ConsolidatedBillLine[] => {
  const map = new Map<string, ConsolidatedBillLine>();
  const order: string[] = [];

  items.forEach((it) => {
    const unitPrice = (it.unitPrice ?? 0) + (it.addons ?? 0);
    const key = [
      it.name,
      JSON.stringify(it.customizations ?? {}),
      (it.customMessage ?? '').trim(),
    ].join('␟');

    const existing = map.get(key);
    if (existing) {
      existing.quantity += it.quantity;
      existing.lineTotal = existing.unitPrice * existing.quantity;
      return;
    }

    map.set(key, {
      name: it.name,
      quantity: it.quantity,
      unitPrice,
      lineTotal: unitPrice * it.quantity,
      customizations: it.customizations,
      customMessage: it.customMessage,
    });
    order.push(key);
  });

  return order.map((k) => map.get(k)!);
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'bill';

// ---------- Layout ----------
// 80mm thermal roll. jspdf has no "auto" page height, so we make a
// very tall page and let the receipt occupy only the top portion.
// Printers that read this PDF will output a slip the length of the
// content (or a full page for A4-style printers, but the visual style
// matches the POS slip exactly).
const PAGE_W_MM = 80;
const PAGE_H_MM = 900;
const MARGIN_MM = 4;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2; // 72mm

// Column widths in mm, matching Receipt.module.scss.
const COL_SN_MM = 5;
const COL_QTY_MM = 8;
const COL_PRICE_MM = 15;
const COL_TOTAL_MM = 18;
const COL_GAP_MM = 1;
const COL_NAME_MM =
  CONTENT_W_MM -
  COL_SN_MM -
  COL_QTY_MM -
  COL_PRICE_MM -
  COL_TOTAL_MM -
  COL_GAP_MM * 4;

// Right-edge X anchors (mm, origin top-left)
const X_LEFT = MARGIN_MM;
const X_RIGHT = PAGE_W_MM - MARGIN_MM;
const X_TOTAL_RIGHT = X_RIGHT;
const X_PRICE_RIGHT = X_TOTAL_RIGHT - COL_TOTAL_MM - COL_GAP_MM;
const X_QTY_RIGHT = X_PRICE_RIGHT - COL_PRICE_MM - COL_GAP_MM;
const X_NAME_LEFT = X_LEFT + COL_SN_MM + COL_GAP_MM;
const X_SN_LEFT = X_LEFT;

// Font sizes in points, tuned for 80mm at print resolution.
const FONT_BASE = 7;        // 9.5px @96dpi ≈ 7pt
const FONT_HEADER = 9;      // 12px ≈ 9pt
const FONT_TINY = 6;        // 8.5px ≈ 6pt
const FONT_TOTAL = 8.5;     // 11px ≈ 8.5pt

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const dashedLine = (
  pdf: jsPDF,
  y: number,
  x1 = X_LEFT,
  x2 = X_RIGHT,
) => {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([0.6, 0.6], 0);
  pdf.line(x1, y, x2, y);
  pdf.setLineDashPattern([], 0);
};

const solidLine = (
  pdf: jsPDF,
  y: number,
  x1 = X_LEFT,
  x2 = X_RIGHT,
) => {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.line(x1, y, x2, y);
};

export const downloadBillPdf = (
  order: DineinOrder,
  tenant: BillTenantInfo,
): void => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, PAGE_H_MM],
  });

  pdf.setFont('courier', 'normal');
  pdf.setTextColor(0, 0, 0);

  let y = MARGIN_MM + 2;

  // =========================================================
  // Header (centered)
  // =========================================================
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(FONT_HEADER);
  const title = tenant.displayName.toUpperCase();
  pdf.text(title, PAGE_W_MM / 2, y, { align: 'center' });
  y += 4.5;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);

  if (tenant.storeTagline) {
    pdf.text(tenant.storeTagline, PAGE_W_MM / 2, y, {
      align: 'center',
    });
    y += 3.5;
  }

  const tableHeading =
    order.tableLabelKind === 'number'
      ? `Table ${order.tableLabel}`
      : order.tableLabel;
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(FONT_BASE);
  pdf.text(tableHeading, PAGE_W_MM / 2, y, { align: 'center' });
  y += 4;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);
  pdf.text(`Order #${order.orderNo}`, PAGE_W_MM / 2, y, {
    align: 'center',
  });
  y += 3.5;
  pdf.text(
    new Date(order.createdAt).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
    PAGE_W_MM / 2,
    y,
    { align: 'center' },
  );
  y += 4;

  dashedLine(pdf, y);
  y += 3;

  // =========================================================
  // Column headers
  // =========================================================
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(FONT_TINY);
  pdf.text('#', X_SN_LEFT, y);
  pdf.text('Item', X_NAME_LEFT, y);
  pdf.text('Qty', X_QTY_RIGHT, y, { align: 'right' });
  pdf.text('Price', X_PRICE_RIGHT, y, { align: 'right' });
  pdf.text('Total', X_TOTAL_RIGHT, y, { align: 'right' });
  y += 2;
  solidLine(pdf, y);
  y += 3.5;

  // =========================================================
  // Item rows
  // =========================================================
  const lines = consolidateItems(order.items);
  const lineGap = 3.5;
  const subGap = 3;

  lines.forEach((line, idx) => {
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(FONT_BASE);

    // Wrap the name to the name-column width.
    const nameLines = pdf.splitTextToSize(line.name, COL_NAME_MM);

    // Row baseline
    pdf.text(String(idx + 1), X_SN_LEFT, y);
    pdf.text(String(line.quantity), X_QTY_RIGHT, y, { align: 'right' });
    pdf.text(rupees(line.unitPrice), X_PRICE_RIGHT, y, { align: 'right' });
    pdf.text(rupees(line.lineTotal), X_TOTAL_RIGHT, y, { align: 'right' });

    // Name may span multiple lines; other columns stay on the first line.
    nameLines.forEach((ln: string, i: number) => {
      pdf.text(ln, X_NAME_LEFT, y + i * lineGap);
    });

    y += Math.max(nameLines.length, 1) * lineGap;

    // Customizations
    if (line.customizations && Object.keys(line.customizations).length > 0) {
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(FONT_TINY);
      const cs = Object.entries(line.customizations)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      const csLines = pdf.splitTextToSize(`. ${cs}`, COL_NAME_MM);
      csLines.forEach((ln: string) => {
        pdf.text(ln, X_NAME_LEFT, y);
        y += subGap;
      });
    }

    // Note
    if (line.customMessage && line.customMessage.trim()) {
      pdf.setFont('courier', 'italic');
      pdf.setFontSize(FONT_TINY);
      const noteLines = pdf.splitTextToSize(
        `Note: ${line.customMessage.trim()}`,
        COL_NAME_MM,
      );
      noteLines.forEach((ln: string) => {
        pdf.text(ln, X_NAME_LEFT, y);
        y += subGap;
      });
    }

    y += 1;
  });

  dashedLine(pdf, y);
  y += 4;

  // =========================================================
  // Totals
  // =========================================================
  const totalsRightX = X_RIGHT;
  const totalsLabelX = X_LEFT + CONTENT_W_MM - 40;

  const totalRow = (
    label: string,
    amount: string,
    bold = false,
  ) => {
    pdf.setFont('courier', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? FONT_TOTAL : FONT_BASE);
    pdf.text(label, totalsLabelX, y);
    pdf.text(amount, totalsRightX, y, { align: 'right' });
    y += bold ? 4.5 : 3.8;
  };

  totalRow('Subtotal', rupees(order.subtotal));
  if (order.gstAmount > 0) {
    totalRow(`GST (${order.gstPercent}%)`, rupees(order.gstAmount));
  }
  if (order.packingCharge > 0) {
    totalRow('Packing', rupees(order.packingCharge));
  }
  if (order.storewideDiscount > 0) {
    totalRow('Discount', `-${rupees(order.storewideDiscount)}`);
  }

  solidLine(pdf, y - 1);
  y += 1.5;
  const billTotal = order.totalAmount - (order.staffTip ?? 0);
totalRow('Total', rupees(billTotal), true);

  // =========================================================
  // Footer
  // =========================================================
  y += 1;
  dashedLine(pdf, y);
  y += 4;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);
  pdf.text('Thank you! Visit again.', PAGE_W_MM / 2, y, {
    align: 'center',
  });

  pdf.save(`${slugify(tenant.displayName)}-bill-${order.orderNo}.pdf`);
};
// src/utils/billPdf.ts
import jsPDF from 'jspdf';
import { DineinOrder, DineinOrderItem } from '../types';

export interface BillTenantInfo {
  displayName: string;
  storeTagline?: string;
  gstPercent?: number;
}

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
const PAGE_W_MM = 80;
const MEASURE_H_MM = 900; // tall page used only for measuring
const MARGIN_MM = 4;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;

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

const X_LEFT = MARGIN_MM;
const X_RIGHT = PAGE_W_MM - MARGIN_MM;
const X_TOTAL_RIGHT = X_RIGHT;
const X_PRICE_RIGHT = X_TOTAL_RIGHT - COL_TOTAL_MM - COL_GAP_MM;
const X_QTY_RIGHT = X_PRICE_RIGHT - COL_PRICE_MM - COL_GAP_MM;
const X_NAME_LEFT = X_LEFT + COL_SN_MM + COL_GAP_MM;
const X_SN_LEFT = X_LEFT;

const FONT_BASE = 7;
const FONT_HEADER = 9;
const FONT_TINY = 6;
const FONT_TOTAL = 8.5;

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

/**
 * Draw the bill onto `pdf` and return the final cursor Y (mm).
 * Identical content to your existing bill; only the caller decides
 * the page height.
 */
const renderBill = (
  pdf: jsPDF,
  order: DineinOrder,
  tenant: BillTenantInfo,
): number => {
  pdf.setFont('courier', 'normal');
  pdf.setTextColor(0, 0, 0);

  let y = MARGIN_MM + 2;

  // ---------- Header ----------
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

  // ---------- Column headers ----------
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

  // ---------- Item rows ----------
  const lines = consolidateItems(order.items);
  const lineGap = 3.5;
  const subGap = 3;

  lines.forEach((line, idx) => {
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(FONT_BASE);

    const nameLines = pdf.splitTextToSize(line.name, COL_NAME_MM);

    pdf.text(String(idx + 1), X_SN_LEFT, y);
    pdf.text(String(line.quantity), X_QTY_RIGHT, y, { align: 'right' });
    pdf.text(rupees(line.unitPrice), X_PRICE_RIGHT, y, { align: 'right' });
    pdf.text(rupees(line.lineTotal), X_TOTAL_RIGHT, y, { align: 'right' });

    nameLines.forEach((ln: string, i: number) => {
      pdf.text(ln, X_NAME_LEFT, y + i * lineGap);
    });

    y += Math.max(nameLines.length, 1) * lineGap;

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

  // ---------- Totals ----------
  const totalsRightX = X_RIGHT;
  const totalsLabelX = X_LEFT + CONTENT_W_MM - 40;

  const totalRow = (label: string, amount: string, bold = false) => {
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

  // ---------- Footer ----------
  y += 1;
  dashedLine(pdf, y);
  y += 4;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);
  pdf.text('Thank you! Visit again.', PAGE_W_MM / 2, y, {
    align: 'center',
  });
  y += 3;

  return y + MARGIN_MM + 1; // small bottom padding
};

export const downloadBillPdf = (
  order: DineinOrder,
  tenant: BillTenantInfo,
): void => {
  // 1. Measure pass.
  const measurePdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, MEASURE_H_MM],
  });
  const naturalHeight = renderBill(measurePdf, order, tenant);

  // 2. Real pass with exact height.
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, naturalHeight],
  });
  renderBill(pdf, order, tenant);

  pdf.save(`${slugify(tenant.displayName)}-bill-${order.orderNo}.pdf`);
};

// ───────────────────────────── Token slip ─────────────────────────────

export interface TokenTenantInfo {
  displayName: string;
  storeTagline?: string;
  storeAddress?: string;
  whatsappPhone?: string;
  ownerPhone?: string;
  gstNo?: string;
}

export interface TokenAppointment {
  token_no: number;
  patient_name: string;
  phone?: string;
  age?: string | number | null;
  gender?: string | null;
  address?: string | null;
  doctor_name?: string | null;
  service_name?: string | null;   // from the service name if available
  category?: string | null;       // the OPD "department"
  price?: number | null;          // consultation fee
  payment_status?: string | null;
  booking_date?: string | null;
  created_at?: string | null;
}

const renderToken = (
  pdf: jsPDF,
  appointment: TokenAppointment,
  tenant: TokenTenantInfo,
): number => {
  pdf.setTextColor(0, 0, 0);
  let y = MARGIN_MM + 2;

  // ───── Accent bar ─────
  pdf.setFillColor(30, 126, 52);          // brand green
  pdf.rect(X_LEFT, y, CONTENT_W_MM, 1, 'F');
  y += 8;

  // ───── Header ─────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const storeName = (tenant.displayName || 'Hospital').toUpperCase();
  const nameLines = pdf.splitTextToSize(storeName, CONTENT_W_MM);
  nameLines.forEach((ln: string) => {
    pdf.text(ln, PAGE_W_MM / 2, y, { align: 'center' });
    y += 4.5;
  });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_TINY);

  if (tenant.storeTagline) {
    const lines = pdf.splitTextToSize(tenant.storeTagline, CONTENT_W_MM);
    lines.forEach((ln: string) => {
      pdf.text(ln, PAGE_W_MM / 2, y, { align: 'center' });
      y += 3;
    });
  }

  if (tenant.storeAddress) {
    const lines = pdf.splitTextToSize(tenant.storeAddress, CONTENT_W_MM);
    lines.forEach((ln: string) => {
      pdf.text(ln, PAGE_W_MM / 2, y, { align: 'center' });
      y += 3;
    });
  }

  const contactBits: string[] = [];
  if (tenant.whatsappPhone) contactBits.push(`Ph: ${tenant.whatsappPhone}`);
  if (tenant.ownerPhone && tenant.ownerPhone !== tenant.whatsappPhone) {
    contactBits.push(`Alt: ${tenant.ownerPhone}`);
  }
  if (contactBits.length > 0) {
    const line = contactBits.join('  ·  ');
    const lines = pdf.splitTextToSize(line, CONTENT_W_MM);
    lines.forEach((ln: string) => {
      pdf.text(ln, PAGE_W_MM / 2, y, { align: 'center' });
      y += 3;
    });
  }
  if (tenant.gstNo) {
    pdf.text(`GSTIN: ${tenant.gstNo}`, PAGE_W_MM / 2, y, { align: 'center' });
    y += 3;
  }

  y += 1;
  solidLine(pdf, y);
  y += 4;

  // ───── Token hero ─────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('TOKEN', PAGE_W_MM / 2, y, { align: 'center' });
  y += 10;

  pdf.setFont('courier', 'bold');
  pdf.setFontSize(30);
  pdf.text(String(appointment.token_no), PAGE_W_MM / 2, y, {
    align: 'center',
  });
  y += 8;

  // Small date + time line under the number
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_TINY);
  const dateStr = appointment.booking_date
    ? new Date(
        `${appointment.booking_date}T${new Date()
          .toTimeString()
          .slice(0, 8)}`,
      ).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  pdf.text(`${dateStr}  ·  ${timeStr}`, PAGE_W_MM / 2, y, {
    align: 'center',
  });
  y += 4;

  solidLine(pdf, y);
  y += 4;

  // ───── Details block (key/value, right-aligned values) ─────
  const LABEL_W = 22;                    // mm reserved for the label column
  const VALUE_W = CONTENT_W_MM - LABEL_W;

  const detail = (
    label: string,
    value: string,
    opts: { bold?: boolean } = {},
  ) => {
    if (!value || value.trim() === '') return;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_TINY);
    pdf.text(`${label}`, X_LEFT, y);

    const valueLines = pdf.splitTextToSize(
      value,
      VALUE_W,
    ) as string[];

    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(FONT_BASE);
    valueLines.forEach((ln: string, i: number) => {
      pdf.text(ln, X_LEFT + LABEL_W, y + i * 3.5);
    });

    y += Math.max(valueLines.length, 1) * 3.5 + 0.5;
  };

  detail('Patient', appointment.patient_name, { bold: true });

  if (appointment.phone) {
    detail('Phone', String(appointment.phone));
  }

  const ageGender: string[] = [];
  if (
    appointment.age !== null &&
    appointment.age !== undefined &&
    String(appointment.age).trim() !== ''
  ) {
    ageGender.push(String(appointment.age));
  }
  if (appointment.gender) ageGender.push(String(appointment.gender));
  if (ageGender.length > 0) {
    detail('Age / Sex', ageGender.join('  ·  '));
  }

  if (appointment.address) {
    detail('Address', appointment.address);
  }
  if (appointment.category) {
    detail('Department', appointment.category);
  }
  if (appointment.service_name) {
    detail('Service', appointment.service_name);
  }
  if (appointment.doctor_name) {
    detail('Doctor', appointment.doctor_name);
  }
  if (
    appointment.price !== null &&
    appointment.price !== undefined &&
    Number(appointment.price) > 0
  ) {
    detail('Fee', rupees(Number(appointment.price)), { bold: true });
  }

  // Payment status as a colored pill, not a text row
  if (appointment.payment_status) {
    const status = String(appointment.payment_status).toUpperCase();
    const isConfirmed = status === 'CONFIRMED';
    const isRejected = status === 'REJECTED';
    const isPending = !isConfirmed && !isRejected;

    const bg = isConfirmed
      ? [220, 252, 231]                   // green-100
      : isRejected
        ? [254, 226, 226]                 // red-100
        : isPending
          ? [254, 243, 199]               // amber-100
          : [241, 245, 249];

    const fg = isConfirmed
      ? [22, 101, 52]                     // green-800
      : isRejected
        ? [153, 27, 27]                   // red-800
        : isPending
          ? [146, 64, 14]                 // amber-800
          : [51, 65, 85];

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(FONT_TINY);
    const pad = 2;
    const textW = pdf.getTextWidth(status);
    const pillW = textW + pad * 2;
    const pillH = 7;

    const pillX = X_LEFT;
    const pillY = y + 2;

    pdf.setFillColor(bg[0], bg[1], bg[2]);
    pdf.roundedRect(pillX, pillY - 3.5, pillW, pillH, 1.5, 1.5, 'F');
    pdf.setTextColor(fg[0], fg[1], fg[2]);
    pdf.text(status, pillX + pad, pillY, { baseline: 'middle' });
    pdf.setTextColor(0, 0, 0);

    y += pillH + 1;
  }

  y += 2;
  solidLine(pdf, y);
  y += 4;

  // ───── Footer strip ─────
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(FONT_TINY);
  pdf.text(
    'Please keep this token. Show it at the counter.',
    PAGE_W_MM / 2,
    y,
    { align: 'center' },
  );
  y += 3.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_BASE);
  pdf.text('Thank you!', PAGE_W_MM / 2, y, { align: 'center' });
  y += 3;

  return y + MARGIN_MM + 1;
};

export const downloadTokenPdf = (
  appointment: TokenAppointment,
  tenant: TokenTenantInfo,
): void => {
  // 1. Measure pass.
  const measurePdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, MEASURE_H_MM],
  });
  const naturalHeight = renderToken(measurePdf, appointment, tenant);

  // 2. Real pass with the exact height.
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, naturalHeight],
  });
  renderToken(pdf, appointment, tenant);

  pdf.save(
    `${slugify(tenant.displayName)}-token-${appointment.token_no}.pdf`,
  );
};
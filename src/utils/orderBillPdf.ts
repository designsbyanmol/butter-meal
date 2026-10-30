// src/utils/orderBillPdf.ts
import jsPDF from 'jspdf';
import { CartItem, PaymentMode, ScheduleData, DeliveryType } from '../types';

export interface OrderBillTenant {
  displayName: string;
  storeTagline?: string;
  gstPercent?: number;
  storeAddress?: string;
  whatsappPhone?: string;
  gstNo?: string;
  upiId?: string;
}

export interface OrderBillPayload {
  tenant: OrderBillTenant;
  orderNo: string;
  customerName: string;
  paymentMode: PaymentMode;
  deliveryType: DeliveryType;
  scheduleData: ScheduleData | null;
  cart: CartItem[];
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  discountPercent: number;
  deliveryFee: number;
  packingCharge: number;
  total: number;
  deliveryTime: string;
}

const PAGE_W_MM = 80;
const MEASURE_H_MM = 900;
const MARGIN_MM = 4;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;

const X_LEFT = MARGIN_MM;
const X_RIGHT = PAGE_W_MM - MARGIN_MM;
const X_CENTER = PAGE_W_MM / 2;

const FONT_BASE = 7;
const FONT_HEADER = 9;
const FONT_TINY = 6;
const FONT_TOTAL = 8.5;

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const dashed = (pdf: jsPDF, y: number) => {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([0.6, 0.6], 0);
  pdf.line(X_LEFT, y, X_RIGHT, y);
  pdf.setLineDashPattern([], 0);
};

const solid = (pdf: jsPDF, y: number) => {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.line(X_LEFT, y, X_RIGHT, y);
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'bill';

const renderBill = (pdf: jsPDF, payload: OrderBillPayload): number => {
  const {
    tenant,
    orderNo,
    customerName,
    paymentMode,
    deliveryType,
    scheduleData,
    cart,
    subtotal,
    gstAmount,
    discountAmount,
    discountPercent,
    deliveryFee,
    packingCharge,
    total,
    deliveryTime,
  } = payload;

  pdf.setFont('courier', 'normal');
  pdf.setTextColor(0, 0, 0);

  let y = MARGIN_MM + 2;

  // ---------- Header (all centered) ----------
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(FONT_HEADER);
  pdf.text(tenant.displayName.toUpperCase(), X_CENTER, y, {
    align: 'center',
  });
  y += 4.5;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);

  if (tenant.storeAddress) {
    const addrLines = pdf.splitTextToSize(
      tenant.storeAddress,
      CONTENT_W_MM - 4,
    );
    addrLines.forEach((ln: string) => {
      pdf.text(ln, X_CENTER, y, { align: 'center' });
      y += 3;
    });
  }
  if (tenant.storeTagline) {
    pdf.text(tenant.storeTagline, X_CENTER, y, { align: 'center' });
    y += 3.5;
  }
  if (tenant.gstNo) {
    pdf.setFont('courier', 'bold');
    pdf.text(`GSTIN: ${tenant.gstNo}`, X_CENTER, y, { align: 'center' });
    pdf.setFont('courier', 'normal');
    y += 3.5;
  }
  if (tenant.whatsappPhone) {
    pdf.text(`Ph: ${tenant.whatsappPhone}`, X_CENTER, y, {
      align: 'center',
    });
    y += 3.5;
  }

  y += 1;
  solid(pdf, y);
  y += 3.5;

  // ---------- Order meta ----------
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(FONT_BASE);
  pdf.text('ORDER BILL', X_CENTER, y, { align: 'center' });
  y += 4;

  // 2-column grid: left = bill info, right = customer info. 50/50.
  const COL_MID = X_LEFT + CONTENT_W_MM / 2;
  const COL_MID_GAP = 1.5;

  // Left column X start / right column X start
  const LX = X_LEFT;
  const RX = COL_MID + COL_MID_GAP;
  const RX_END = X_RIGHT;

  // Row 1: Bill Ref | Customer
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);
  pdf.text(`Bill Ref: ${orderNo}`, LX, y);
  pdf.text(
    `Customer: ${customerName || 'Guest'}`,
    RX_END,
    y,
    { align: 'right' },
  );
  y += 3.2;

  // Row 2: Delivery | Payment
  const deliveryLine =
    deliveryType === 'schedule' && scheduleData
      ? `Scheduled: ${scheduleData.date} ${scheduleData.time}`
      : `Delivery: ~${deliveryTime}`;
  const paymentLine = `Payment: ${paymentMode}${
    paymentMode === 'Online' && discountPercent > 0
      ? ` (${discountPercent}% off)`
      : ''
  }`;
  pdf.text(deliveryLine, LX, y);
  pdf.text(paymentLine, RX_END, y, { align: 'right' });
  y += 4;

  dashed(pdf, y);
  y += 3;

  // ---------- Column geometry (item wider, others compact) ----------
  const COL_SN = 4;
  const COL_QTY = 6;
  const COL_PRICE = 12;
  const COL_TOTAL = 14;
  const COL_GAP = 1;
  const COL_NAME =
    CONTENT_W_MM -
    COL_SN -
    COL_QTY -
    COL_PRICE -
    COL_TOTAL -
    COL_GAP * 4;

  const X_SN = X_LEFT;
  const X_NAME = X_SN + COL_SN + COL_GAP;
  const X_QTY_R = X_RIGHT - COL_TOTAL - COL_GAP - COL_PRICE - COL_GAP;
  const X_PRICE_R = X_RIGHT - COL_TOTAL - COL_GAP;
  const X_TOTAL_R = X_RIGHT;

  pdf.setFont('courier', 'bold');
  pdf.setFontSize(FONT_TINY);
  pdf.text('#', X_SN, y);
  pdf.text('Item', X_NAME, y);
  pdf.text('Qty', X_QTY_R, y, { align: 'right' });
  pdf.text('Price', X_PRICE_R, y, { align: 'right' });
  pdf.text('Total', X_TOTAL_R, y, { align: 'right' });
  y += 2;
  solid(pdf, y);
  y += 3.5;

  // ---------- Items ----------
  const lineGap = 3.5;
  const subGap = 3;

  cart.forEach((it, idx) => {
    const base = it.basePrice ?? it.price;
    const addons = it.addonPrice ?? 0;
    const unit = base + addons;
    const lineTotal = unit * it.quantity;

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(FONT_BASE);

    const nameLines = pdf.splitTextToSize(it.name, COL_NAME);

    pdf.text(String(idx + 1), X_SN, y);
    pdf.text(String(it.quantity), X_QTY_R, y, { align: 'right' });
    pdf.text(rupees(unit), X_PRICE_R, y, { align: 'right' });
    pdf.text(rupees(lineTotal), X_TOTAL_R, y, { align: 'right' });

    nameLines.forEach((ln: string, i: number) => {
      pdf.text(ln, X_NAME, y + i * lineGap);
    });
    y += Math.max(nameLines.length, 1) * lineGap;

    if (it.customizations && Object.keys(it.customizations).length > 0) {
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(FONT_TINY);
      const cs = Object.entries(it.customizations)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      pdf.splitTextToSize(`. ${cs}`, COL_NAME).forEach((ln: string) => {
        pdf.text(ln, X_NAME, y);
        y += subGap;
      });
    }
    if (it.customMessage && it.customMessage.trim()) {
      pdf.setFont('courier', 'italic');
      pdf.setFontSize(FONT_TINY);
      pdf
        .splitTextToSize(`Note: ${it.customMessage.trim()}`, COL_NAME)
        .forEach((ln: string) => {
          pdf.text(ln, X_NAME, y);
          y += subGap;
        });
    }
    y += 1;
  });

  dashed(pdf, y);
  y += 4;

  // ---------- Totals ----------
  const totalsLabelX = X_LEFT + CONTENT_W_MM - 40;

  const totalRow = (label: string, amount: string, bold = false) => {
    pdf.setFont('courier', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? FONT_TOTAL : FONT_BASE);
    pdf.text(label, totalsLabelX, y);
    pdf.text(amount, X_RIGHT, y, { align: 'right' });
    y += bold ? 4.5 : 3.8;
  };

  totalRow('Subtotal', rupees(subtotal));
  if (packingCharge > 0) totalRow('Packing', rupees(packingCharge));
  if (gstAmount > 0) {
    totalRow(`GST (${tenant.gstPercent ?? 0}%)`, rupees(gstAmount));
  }
  if (deliveryFee > 0) totalRow('Delivery', rupees(deliveryFee));
  if (discountAmount > 0) {
    totalRow(
      `Discount (${discountPercent}%)`,
      `-${rupees(discountAmount)}`,
    );
  }

  solid(pdf, y - 1);
  y += 1.5;
  totalRow('Total', rupees(total), true);

  // ---------- UPI note (clickable, centered) ----------
  if (tenant.upiId) {
    y += 1;
    dashed(pdf, y);
    y += 3;

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(FONT_TINY);
    pdf.text('Pay via UPI (tap to open):', X_CENTER, y, {
      align: 'center',
    });
    y += 3.5;

    // Build the upi:// URI.
    const upiUri =
      `upi://pay?pa=${encodeURIComponent(tenant.upiId)}` +
      `&pn=${encodeURIComponent(tenant.displayName)}` +
      `&am=${Number(total).toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent('Order ' + orderNo)}`;

    // Draw text AND register the clickable region in one call.
    // textWithLink handles the bounding box correctly, so taps on
    // the UPI ID open the UPI app on mobile.
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(FONT_BASE);
    pdf.setTextColor(0, 0, 0);
    pdf.textWithLink(tenant.upiId, X_CENTER, y, {
      align: 'center',
      url: upiUri,
    });
    y += 4;
  }

  // ---------- Footer ----------
  y += 1;
  dashed(pdf, y);
  y += 4;

  // Timestamp first.
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_TINY);
  const stamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  pdf.text(stamp, X_CENTER, y, { align: 'center' });
  y += 3.5;

  // Then "Order again" below the timestamp.
  pdf.setFont('courier', 'bold');
  pdf.text('Order again soon!', X_CENTER, y, { align: 'center' });
  y += 3;

  return y + MARGIN_MM + 1;
};

export const buildOrderBillPdf = (payload: OrderBillPayload): jsPDF => {
  // 1. Measure pass.
  const measurePdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, MEASURE_H_MM],
  });
  const naturalHeight = renderBill(measurePdf, payload);

  // 2. Real pass — exact height.
  const finalPdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, naturalHeight],
  });
  renderBill(finalPdf, payload);

  return finalPdf;
};

export const buildOrderBillBlob = (payload: OrderBillPayload): Blob => {
  const pdf = buildOrderBillPdf(payload);
  return pdf.output('blob');
};

export const buildOrderBillFile = (
  payload: OrderBillPayload,
): File => {
  const blob = buildOrderBillBlob(payload);
  return new File(
    [blob],
    `${slugify(payload.tenant.displayName)}-${payload.orderNo}.pdf`,
    { type: 'application/pdf' },
  );
};
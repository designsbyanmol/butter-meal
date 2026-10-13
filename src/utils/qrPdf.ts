// src/utils/qrPdf.ts
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface QrPdfPayload {
  title: string;
  subtitle?: string;
  url: string;
  variant?: 'admin' | 'public';
  showUrlText?: boolean;
  generatedAt?: string;
  storeName?: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'qr';

const qrToPngDataUrl = async (
  value: string,
  size = 800,
  dark = '#000000',
): Promise<string> =>
  QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: 0,
    width: size,
    color: { dark, light: '#ffffff' },
  });

// ---------- Colors ----------
const GREEN: [number, number, number] = [60, 170, 70];
const GREEN_DARK: [number, number, number] = [30, 126, 52];
const GREEN_SOFT: [number, number, number] = [244, 251, 245];
const GREY_SOFT: [number, number, number] = [245, 245, 245];
const TEXT: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const TEXT_FAINT: [number, number, number] = [160, 160, 160];
const BORDER: [number, number, number] = [228, 228, 228];
const BORDER_SOFT: [number, number, number] = [240, 235, 230];
const WHITE: [number, number, number] = [255, 255, 255];

// ---------- Layout ----------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

export const downloadQrPdf = async (
  payload: QrPdfPayload,
): Promise<void> => {
  const {
    title,
    subtitle,
    url,
    variant = 'public',
    showUrlText = true,
    generatedAt,
    storeName,
  } = payload;

  const gen =
    generatedAt ??
    new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const isAdmin = variant === 'admin';
  const accentDark = isAdmin ? GREEN_DARK : TEXT;
  const accentFill = isAdmin ? GREEN_SOFT : GREY_SOFT;
  const accentBorder = isAdmin
    ? ([209, 234, 214] as [number, number, number])
    : BORDER;
  const chipLabel = isAdmin ? 'ADMIN' : 'PUBLIC';

  const qrPng = await qrToPngDataUrl(
    url,
    900,
    isAdmin ? '#1e1e11' : '#000000',
  );

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // =========================================================
  // Header
  // =========================================================
  let y = MARGIN;

  if (storeName) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...accentDark);
    pdf.text(storeName.toUpperCase(), MARGIN, y);
    y += 16;
  }

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...TEXT);
  const titleLines = pdf.splitTextToSize(title, CONTENT_W - 80);
  pdf.text(titleLines.slice(0, 2), MARGIN, y + 8);
  y += 8 + titleLines.slice(0, 2).length * 26;

  // Subtitle
  if (subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...TEXT_MUTED);
    const subLines = pdf.splitTextToSize(subtitle, CONTENT_W);
    pdf.text(subLines.slice(0, 2), MARGIN, y + 6);
    y += 6 + subLines.slice(0, 2).length * 14;
  }

  y += 14;

  // Chip (top-right)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const chipW = pdf.getTextWidth(chipLabel) + 22;
  const chipH = 18;
  const chipX = PAGE_W - MARGIN - chipW;
  const chipY = MARGIN - 4;
  pdf.setFillColor(...accentFill);
  pdf.setDrawColor(...accentBorder);
  pdf.roundedRect(chipX, chipY, chipW, chipH, 9, 9, 'FD');
  pdf.setTextColor(...accentDark);
  pdf.text(chipLabel, chipX + chipW / 2, chipY + 12, { align: 'center' });

  // =========================================================
  // QR block (centered)
  // =========================================================
  const qrSize = 340;
  const qrFramePad = 20;
  const qrFrameSize = qrSize + qrFramePad * 2;
  const qrFrameX = (PAGE_W - qrFrameSize) / 2;

  // Card behind the QR
  const cardPadX = 40;
  const cardPadY = 40;
  const cardW = qrFrameSize + cardPadX * 2;
  const cardH = qrFrameSize + cardPadY * 2 + 60; // + caption space
  const cardX = (PAGE_W - cardW) / 2;
  const cardY = y;

  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(...accentBorder);
  pdf.setLineWidth(1);
  pdf.roundedRect(cardX, cardY, cardW, cardH, 16, 16, 'FD');

  // QR frame
  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(...accentBorder);
  pdf.setLineWidth(1);
  pdf.roundedRect(
    qrFrameX,
    cardY + cardPadY,
    qrFrameSize,
    qrFrameSize,
    12,
    12,
    'FD',
  );

  pdf.addImage(
    qrPng,
    'PNG',
    qrFrameX + qrFramePad,
    cardY + cardPadY + qrFramePad,
    qrSize,
    qrSize,
  );

  // Caption under QR
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT);
  const caption = isAdmin
    ? "Point your phone's camera at the QR code to open the admin login."
    : "Point your phone's camera at the QR code to open the store menu.";
  const capLines = pdf.splitTextToSize(caption, cardW - 60);
  pdf.text(
    capLines,
    PAGE_W / 2,
    cardY + cardPadY + qrFrameSize + 24,
    { align: 'center' },
  );

  y = cardY + cardH + 26;

  // =========================================================
  // URL line
  // =========================================================
  if (showUrlText) {
    const urlLineH = 15;
    const urlLines = pdf.splitTextToSize(url, CONTENT_W - 32);
    const shown = urlLines.slice(0, 3);
    const blockH = 30 + shown.length * urlLineH + 8;

    pdf.setFillColor(251, 251, 251);
    pdf.setDrawColor(...BORDER_SOFT);
    pdf.roundedRect(MARGIN, y, CONTENT_W, blockH, 6, 6, 'FD');
    pdf.setFillColor(...accentDark);
    pdf.rect(MARGIN, y, 3, blockH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('URL', MARGIN + 14, y + 18);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT);
    pdf.text(shown, MARGIN + 14, y + 34);

    y += blockH + 20;
  }

  // =========================================================
  // Footer
  // =========================================================
  const footerY = PAGE_H - MARGIN;
  pdf.setDrawColor(...BORDER_SOFT);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN, footerY - 16, PAGE_W - MARGIN, footerY - 16);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text(`Generated: ${gen}`, MARGIN, footerY - 2);
  pdf.text('— Butter Meal', PAGE_W - MARGIN, footerY - 2, {
    align: 'right',
  });

  pdf.save(`${slugify(title)}.pdf`);
};

export const downloadAdminQrPdf = (opts: {
  storeName: string;
  url: string;
  generatedAt?: string;
}) =>
  downloadQrPdf({
    title: `${opts.storeName} — Admin QR`,
    subtitle: 'Scan to open the admin login for your store.',
    url: opts.url,
    variant: 'admin',
    showUrlText: true,
    storeName: opts.storeName,
    generatedAt: opts.generatedAt,
  });

export const downloadPublicQrPdf = (opts: {
  storeName: string;
  url: string;
  generatedAt?: string;
}) =>
  downloadQrPdf({
    title: `${opts.storeName} — Public QR`,
    subtitle: 'Scan to open the store menu.',
    url: opts.url,
    variant: 'public',
    showUrlText: true,
    storeName: opts.storeName,
    generatedAt: opts.generatedAt,
  });
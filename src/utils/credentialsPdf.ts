// src/utils/credentialsPdf.ts
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface CredentialsPdfPayload {
  storeName: string;
  publicUrl: string;
  adminUrl: string;
  phone: string;
  password: string;
  planName: string;
  months: number;
  expiresAt: string;
  generatedAt?: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'credentials';

const qrToPngDataUrl = async (
  value: string,
  size = 400,
  dark = '#000000',
): Promise<string> =>
  QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: { dark, light: '#ffffff' },
  });

const GREEN: [number, number, number] = [60, 170, 70];
const GREEN_DARK: [number, number, number] = [30, 126, 52];
const GREEN_SOFT: [number, number, number] = [244, 251, 245];
const AMBER_SOFT: [number, number, number] = [255, 248, 225];
const TEXT: [number, number, number] = [30, 30, 30];
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const TEXT_FAINT: [number, number, number] = [160, 160, 160];
const BORDER: [number, number, number] = [228, 228, 228];
const BORDER_SOFT: [number, number, number] = [240, 235, 230];
const WHITE: [number, number, number] = [255, 255, 255];

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

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

  const [adminQr, publicQr] = await Promise.all([
    qrToPngDataUrl(adminUrl, 400, '#1e1e1e'),
    qrToPngDataUrl(publicUrl, 400, '#1e1e1e'),
  ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  let y = MARGIN;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...TEXT);
  pdf.text(storeName.toUpperCase(), MARGIN, y + 8);
  y += 26;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Account Credentials . Store Login Details', MARGIN, y);
  y += 20;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  const pillText = 'CONFIDENTIAL';
  const pillW = pdf.getTextWidth(pillText) + 20;
  const pillH = 18;
  const pillX = PAGE_W - MARGIN - pillW;
  const pillY = MARGIN - 2;
  pdf.setFillColor(...GREEN_SOFT);
  pdf.setDrawColor(209, 234, 214);
  pdf.roundedRect(pillX, pillY, pillW, pillH, 9, 9, 'FD');
  pdf.setTextColor(...GREEN_DARK);
  pdf.text(pillText, pillX + pillW / 2, pillY + 12, { align: 'center' });

  y += 8;

  const cardGap = 12;
  const cardW = (CONTENT_W - cardGap) / 2;
  const cardH = 52;

  pdf.setFillColor(...GREEN_SOFT);
  pdf.setDrawColor(209, 234, 214);
  pdf.roundedRect(MARGIN, y, cardW, cardH, 8, 8, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('PLAN', MARGIN + 14, y + 16);
  pdf.setFontSize(13);
  pdf.setTextColor(...TEXT);
  pdf.text(`${planName}`, MARGIN + 14, y + 36);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(
    `. ${months} month${months > 1 ? 's' : ''}`,
    MARGIN + 24 + pdf.getTextWidth(`${planName}`) + 8,
    y + 36,
  );

  pdf.setFillColor(...AMBER_SOFT);
  pdf.setDrawColor(253, 230, 138);
  pdf.roundedRect(MARGIN + cardW + cardGap, y, cardW, cardH, 8, 8, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('VALID TILL', MARGIN + cardW + cardGap + 14, y + 16);
  pdf.setFontSize(13);
  pdf.setTextColor(...TEXT);
  pdf.text(expiresAt, MARGIN + cardW + cardGap + 14, y + 36);

  y += cardH + 22;

  const rowH = 34;
  const detailBoxH = rowH * 2 + 8;

  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(MARGIN, y, CONTENT_W, detailBoxH, 8, 8, 'S');

  const drawRow = (
    topY: number,
    label: string,
    value: string,
    isLast: boolean,
    valueColor: [number, number, number] = TEXT,
    mono = true,
  ) => {
    if (!isLast) {
      pdf.setDrawColor(...BORDER_SOFT);
      pdf.setLineWidth(0.8);
      pdf.line(MARGIN + 16, topY + rowH, PAGE_W - MARGIN - 16, topY + rowH);
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label.toUpperCase(), MARGIN + 16, topY + 20);

    pdf.setFont(mono ? 'courier' : 'helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...valueColor);
    pdf.text(value, PAGE_W - MARGIN - 16, topY + 21, { align: 'right' });
  };

  drawRow(y + 4, 'Login Phone', `+91 ${phone}`, false);
  drawRow(y + 4 + rowH, 'Password', password, true, GREEN_DARK, true);

  y += detailBoxH + 22;

  const btnH = 44;
  const btnGap = 12;
  const btnW = (CONTENT_W - btnGap) / 2;

  pdf.setFillColor(...GREEN);
  pdf.roundedRect(MARGIN, y, btnW, btnH, 8, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('ADMIN STORE', MARGIN + 14, y + 16);
  pdf.setFontSize(11);
  pdf.text('Sign in to manage', MARGIN + 14, y + 32);
  pdf.setFontSize(16);
  pdf.text('›', MARGIN + btnW - 16, y + 28, { align: 'right' });

  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(...GREEN_DARK);
  pdf.setLineWidth(1);
  pdf.roundedRect(MARGIN + btnW + btnGap, y, btnW, btnH, 8, 8, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...GREEN_DARK);
  pdf.text('PUBLIC STORE', MARGIN + btnW + btnGap + 14, y + 16);
  pdf.setTextColor(...TEXT);
  pdf.setFontSize(11);
  pdf.text(
    'Share with customers',
    MARGIN + btnW + btnGap + 14,
    y + 32,
  );
  pdf.setTextColor(...GREEN_DARK);
  pdf.setFontSize(16);
  pdf.text('›', PAGE_W - MARGIN - 16, y + 28, { align: 'right' });

  pdf.link(MARGIN, y, btnW, btnH, { url: adminUrl });
  pdf.link(MARGIN + btnW + btnGap, y, btnW, btnH, { url: publicUrl });

  y += btnH + 22;

  const qrCardH = 128;
  const qrCardGap = 12;
  const qrCardW = (CONTENT_W - qrCardGap) / 2;
  const qrSize = 88;
  const qrPad = 8;

  pdf.setFillColor(...GREEN_SOFT);
  pdf.setDrawColor(...GREEN_SOFT);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(MARGIN, y, qrCardW, qrCardH, 8, 8, 'FD');

  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(209, 234, 214);
  pdf.roundedRect(MARGIN + 10, y + 12, qrSize + qrPad * 2, qrSize + qrPad * 2, 6, 6, 'FD');
  pdf.addImage(
    adminQr,
    'PNG',
    MARGIN + 10 + qrPad,
    y + 12 + qrPad,
    qrSize,
    qrSize,
  );

  const qrTextX = MARGIN + 10 + qrSize + qrPad * 2 + 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...GREEN_DARK);
  pdf.text('ADMIN QR', qrTextX, y + 26);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT);
  pdf.text('Scan to open', qrTextX, y + 42);

  const qrX2 = MARGIN + qrCardW + qrCardGap;
  pdf.setFillColor(250, 250, 250);
  pdf.setDrawColor(...BORDER);
  pdf.roundedRect(qrX2, y, qrCardW, qrCardH, 8, 8, 'FD');

  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(...BORDER);
  pdf.roundedRect(qrX2 + 10, y + 12, qrSize + qrPad * 2, qrSize + qrPad * 2, 6, 6, 'FD');
  pdf.addImage(
    publicQr,
    'PNG',
    qrX2 + 10 + qrPad,
    y + 12 + qrPad,
    qrSize,
    qrSize,
  );

  const qrTextX2 = qrX2 + 10 + qrSize + qrPad * 2 + 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT);
  pdf.text('PUBLIC QR', qrTextX2, y + 26);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Scan to open', qrTextX2, y + 42);

  y += qrCardH + 22;

  const notes = [
    'Click the two buttons above, or scan the QR codes, to open the store URLs.',
    'Keep these credentials safe - do not share them with anyone.',
    'Admin URL is where you sign in to manage your store.',
    'Public URL is what you share with customers.',
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  const lineH = 13;
  const notesH = 12 + 16 + notes.length * lineH + 6;

  pdf.setFillColor(251, 251, 251);
  pdf.setDrawColor(...BORDER_SOFT);
  pdf.roundedRect(MARGIN, y, CONTENT_W, notesH, 6, 6, 'FD');
  pdf.setFillColor(...GREEN);
  pdf.rect(MARGIN, y, 3, notesH, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT);
  pdf.text('Notes', MARGIN + 14, y + 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...TEXT_MUTED);
  notes.forEach((n, i) => {
    pdf.text(`•  ${n}`, MARGIN + 14, y + 18 + 14 + i * lineH);
  });

  y += notesH + 20;

  pdf.setDrawColor(...BORDER_SOFT);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text(`Generated: ${gen}`, MARGIN, y + 14);
  pdf.text('- Butter Meal', PAGE_W - MARGIN, y + 14, { align: 'right' });

  pdf.save(`${slugify(storeName)}-credentials.pdf`);
};
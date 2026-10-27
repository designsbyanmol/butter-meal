// src/utils/qrPdf.ts
import jsPDF from "jspdf";
import QRCode from "qrcode";

// ---------------------------------------------------------------------------
// Footer logo
// ---------------------------------------------------------------------------
const FOOTER_LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp";

interface DecodedLogo {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Fetch an image URL, convert to a PNG data URL, and report its
 * intrinsic size. jsPDF needs the dimensions to compute aspect ratio.
 * Returns null on failure so the caller can fall back to text.
 */
const fetchImageAsPngDataUrl = async (
  url: string,
): Promise<DecodedLogo | null> => {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();

    // Convert whatever blob we got (webp/png/jpeg) into a PNG data URL.
    const dataUrl = await new Promise<string | null>((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(objUrl);
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const png = canvas.toDataURL("image/png");
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

    // Measure intrinsic size.
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
export interface QrPdfPayload {
  title: string;
  subtitle?: string;
  url: string;
  variant?: "admin" | "public";
  showUrlText?: boolean;
  generatedAt?: string;
  storeName?: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "qr";

const qrToPngDataUrl = async (
  value: string,
  size = 800,
  dark = "#000000",
): Promise<string> =>
  QRCode.toDataURL(value, {
    errorCorrectionLevel: "H",
    margin: 0,
    width: size,
    color: { dark, light: "#ffffff" },
  });

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

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

export const downloadQrPdf = async (payload: QrPdfPayload): Promise<void> => {
  const {
    title,
    subtitle,
    url,
    variant = "public",
    showUrlText = true,
    generatedAt,
    storeName,
  } = payload;

  const gen =
    generatedAt ??
    new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const isAdmin = variant === "admin";
  const accentDark = isAdmin ? GREEN_DARK : TEXT;
  const accentFill = isAdmin ? GREEN_SOFT : GREY_SOFT;
  const accentBorder = isAdmin
    ? ([209, 234, 214] as [number, number, number])
    : BORDER;
  const chipLabel = isAdmin ? "ADMIN" : "CUSTOMER";

  const qrPng = await qrToPngDataUrl(url, 900, isAdmin ? "#1e1e11" : "#000000");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

    // ---------------------------------------------------------------------
  // Dark header band - store name + title + variant chip, all inside
  // a strip that spans the full page width.
  // ---------------------------------------------------------------------
  const HEADER_BG: [number, number, number] = [15, 23, 42]; // #0F172A
  const HEADER_PAD_X = 24;
  const HEADER_PAD_Y = 18;

  // Measure how tall the header needs to be so the text fits and
  // wraps properly.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  const titleLines = pdf.splitTextToSize(title, CONTENT_W - 80);
  const shownTitleLines = titleLines.slice(0, 2);

  const titleLineH = 26;
  const storeLineH = 12;
  const subtitleLineH = 14;

  let subLines: string[] = [];
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    subLines = pdf.splitTextToSize(subtitle, CONTENT_W - HEADER_PAD_X * 2);
    subLines = subLines.slice(0, 2);
  }

  const headerHeight =
    HEADER_PAD_Y * 2 +
    (storeName ? storeLineH + 4 : 0) +
    shownTitleLines.length * titleLineH +
    (subLines.length > 0 ? 6 + subLines.length * subtitleLineH : 0);

  // Draw the band (full bleed left-right; only MARGIN top).
  pdf.setFillColor(...HEADER_BG);
  pdf.rect(0, 0, PAGE_W, MARGIN + headerHeight, "F");

  // Text starts inside the band.
  let y = MARGIN + HEADER_PAD_Y;

  if (storeName) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(200, 210, 225); // soft grey-blue for the store name
    pdf.text(storeName.toUpperCase(), MARGIN, y - 4);
    y += storeLineH - 4;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(shownTitleLines, MARGIN, y + 12);
  y += shownTitleLines.length * titleLineH;

  if (subLines.length > 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(200, 210, 225);
    pdf.text(subLines, MARGIN, y + 10);
    y += 6 + subLines.length * subtitleLineH;
  }

  // Variant chip - top-right corner of the band.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  const chipW = pdf.getTextWidth(chipLabel) + 32;
  const chipH = 22;
  const chipX = PAGE_W - MARGIN - chipW;
  const chipY = MARGIN + HEADER_PAD_Y - 1;
  pdf.setFillColor(...accentFill);
  pdf.setDrawColor(...accentBorder);
  pdf.roundedRect(chipX, chipY, chipW, chipH, 9, 9, "FD");
  pdf.setTextColor(...accentDark);
  pdf.text(chipLabel, chipX + chipW / 2, chipY + 15, { align: "center" });

  // Body starts below the band with a small gap.
  y = MARGIN + headerHeight + 60;

  const qrSize = 340;
  const qrFramePad = 20;
  const qrFrameSize = qrSize + qrFramePad * 2;
  const qrFrameX = (PAGE_W - qrFrameSize) / 2;

  const cardPadX = 40;
  const cardPadY = 40;
  const cardW = qrFrameSize + cardPadX * 2;
  const cardH = qrFrameSize + cardPadY * 2 + 60;
  const cardX = (PAGE_W - cardW) / 2;
  const cardY = y;

  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(...accentBorder);
  pdf.setLineWidth(1);
  pdf.roundedRect(cardX, cardY, cardW, cardH, 12, 12, "FD");

  pdf.addImage(
    qrPng,
    "PNG",
    qrFrameX + qrFramePad,
    cardY + cardPadY + qrFramePad,
    qrSize,
    qrSize,
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT);
  const caption = isAdmin
    ? "Point your phone's camera at the QR code to open the admin login."
    : "Point your phone's camera at the QR code to open the store menu.";
  const capLines = pdf.splitTextToSize(caption, cardW - 60);
  pdf.text(capLines, PAGE_W / 2, cardY + cardPadY + qrFrameSize + 24, {
    align: "center",
  });

  y = cardY + cardH + 26;

  if (showUrlText) {
    const urlLineH = 15;
    const urlLines = pdf.splitTextToSize(url, CONTENT_W - 32);
    const shown = urlLines.slice(0, 3);
    const blockH = 30 + shown.length * urlLineH + 8;

    pdf.setFillColor(251, 251, 251);
    pdf.setDrawColor(...BORDER_SOFT);
    pdf.roundedRect(MARGIN, y, CONTENT_W, blockH, 6, 6, "FD");
    pdf.setFillColor(...accentDark);
    pdf.rect(MARGIN, y, 3, blockH, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text("URL", MARGIN + 14, y + 18);

    pdf.setFont("courier", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT);
    pdf.text(shown, MARGIN + 14, y + 34);

    y += blockH + 20;
  }

  const footerY = PAGE_H - MARGIN;
  pdf.setDrawColor(...BORDER_SOFT);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN, footerY - 16, PAGE_W - MARGIN, footerY - 16);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...TEXT_FAINT);
  pdf.text(`Generated: ${gen}`, MARGIN, footerY - 2);

  // Right-aligned brand logo, max 80px wide, proportional height.
  try {
    const logoData = await fetchImageAsPngDataUrl(FOOTER_LOGO_URL);
    if (logoData) {
      const logo = logoData; // { dataUrl, width, height }

      const maxLogoWidth = 80;
      const scale = Math.min(1, maxLogoWidth / logo.width);
      const drawW = logo.width * scale;
      const drawH = logo.height * scale;
      // Vertically center against the footer line.
      const logoX = PAGE_W - MARGIN - drawW;
      const logoY = footerY + 10 - drawH; // sit above the baseline
      pdf.addImage(logo.dataUrl, "PNG", logoX, logoY, drawW, drawH);
    } else {
      // Fallback: text if the image fails to load.
      pdf.text("- Dozzelo", PAGE_W - MARGIN, footerY - 2, {
        align: "right",
      });
    }
  } catch {
    pdf.text("- Dozzelo", PAGE_W - MARGIN, footerY - 2, {
      align: "right",
    });
  }

  pdf.save(`${slugify(title)}.pdf`);
};

export const downloadAdminQrPdf = (opts: {
  storeName: string;
  url: string;
  generatedAt?: string;
}) =>
  downloadQrPdf({
    title: `${opts.storeName} - Admin QR`,
    subtitle: "Scan to open the admin login for your store.",
    url: opts.url,
    variant: "admin",
    showUrlText: false,
    storeName: opts.storeName,
    generatedAt: opts.generatedAt,
  });

export const downloadPublicQrPdf = (opts: {
  storeName: string;
  url: string;
  generatedAt?: string;
}) =>
  downloadQrPdf({
    title: `Scan QR to order`,
    subtitle: "",
    url: opts.url,
    variant: "public",
    showUrlText: false,
    storeName: opts.storeName,
    generatedAt: opts.generatedAt,
  });

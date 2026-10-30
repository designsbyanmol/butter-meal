// src/utils/shareOrderBill.ts
import { buildOrderBillFile, OrderBillPayload } from './orderBillPdf';

export interface ShareOrderResult {
  /** 'shared' = Web Share API delivered the file; 'fallback' = wa.me + download. */
  mode: 'shared' | 'fallback';
  /** Filled when mode === 'fallback'. */
  whatsappUrl?: string;
  /** Filled when mode === 'fallback'. */
  file?: File;
}

/**
 * Try to share the PDF via the Web Share API. If the platform doesn't
 * support file sharing (or the user dismisses the sheet), fall back to
 * the classic wa.me link and return the file so the caller can trigger
 * a download.
 */
export const shareOrderBill = async (
  payload: OrderBillPayload,
  whatsappText: string,
  whatsappPhone: string,
): Promise<ShareOrderResult> => {
  let file: File | null = null;
  try {
    file = buildOrderBillFile(payload);
  } catch (err) {
    console.warn('[shareOrderBill] build failed:', err);
    // Even if building the PDF fails, still send the text message.
    return {
      mode: 'fallback',
      whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        whatsappText,
      )}`,
    };
  }

  // Check for file-sharing support first (Chrome Android, Safari iOS
  // 15+, Edge Android). Note: canShare is not enough — we must try.
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (nav.share && typeof nav.canShare === 'function') {
    try {
      const shareData: ShareData = {
        files: [file],
        title: `Order ${payload.orderNo}`,
        text: whatsappText.slice(0, 200), // short caption inside the share sheet
      };
      if (nav.canShare(shareData)) {
        await nav.share(shareData);
        return { mode: 'shared' };
      }
    } catch (err) {
      // AbortError = user cancelled; anything else = real failure.
      // Both fall through to the fallback path.
      console.warn('[shareOrderBill] share rejected:', err);
    }
  }

  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
  whatsappText,
)}`;

  return { mode: 'fallback', whatsappUrl, file };
};

/** Trigger a browser download for a File. Used in the fallback path. */
export const downloadFile = (file: File): void => {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 800);
};
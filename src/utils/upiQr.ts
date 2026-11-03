// src/utils/upiQr.ts

export interface UpiParams {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  note?: string;
  txnRef?: string;
}

export const buildUpiUri = (p: UpiParams): string => {
  const params = new URLSearchParams();
  params.set("pa", p.payeeVpa);
  params.set("pn", p.payeeName);

  if (p.amount > 0) {
    params.set(
      "am",
      Number.isInteger(p.amount) ? String(p.amount) : p.amount.toFixed(2),
    );
    params.set("cu", "INR");
    if (p.note) params.set("tn", p.note.slice(0, 50));
    if (p.txnRef)
      params.set("tr", p.txnRef.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35));
  }

  return `upi://pay?${params.toString()}`;
};

export const buildUpiQrUrl = (params: UpiParams, size = 240): string => {
  const uri = buildUpiUri(params);
  const encoded = encodeURIComponent(uri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8`;
};

export const DEFAULT_UPI = {
  payeeVpa: "anmolui@ybl",
  payeeName: "Smart Admin",
  bankAccount: "469801500458",
};

// ─────────────────────────────────────────────────────────
// Kept for backwards compatibility with existing imports
// (InvoiceModal, UpiQrCard, CustomerOrderStatus, OrderCheckoutModal).
// They all collapse to the same generic `upi://pay?...` URI now.
// ─────────────────────────────────────────────────────────

export type UpiAppId =
  | "generic"
  | "gpay"
  | "phonepe"
  | "paytm"
  | "bhim"
  | "amazonpay";

export const UPI_APPS: {
  id: UpiAppId;
  label: string;
  scheme: (queryString: string) => string;
  scanScheme: string;
}[] = [
  {
    id: "gpay",
    label: "Google Pay",
    scheme: (qs) => `gpay://upi/pay?${qs}`,
    scanScheme: "gpay://upi/scan",
  },
  {
    id: "phonepe",
    label: "PhonePe",
    scheme: (qs) => `phonepe://pay?${qs}`,
    scanScheme: "phonepe://scan",
  },
  {
    id: "paytm",
    label: "Paytm",
    scheme: (qs) => `paytmmp://pay?${qs}`,
    scanScheme: "paytmmp://scan",
  },
  {
    id: "bhim",
    label: "BHIM UPI",
    scheme: (qs) => `upi://pay?${qs}`,
    scanScheme: "upi://scan",
  },
  {
    id: "amazonpay",
    label: "Amazon Pay",
    scheme: (qs) => `amazonpay://pay?${qs}`,
    scanScheme: "amazonpay://scan",
  },
  {
    id: "generic",
    label: "Other UPI apps",
    scheme: (qs) => `upi://pay?${qs}`,
    scanScheme: "upi://scan",
  },
];

export const buildUpiScanUriForApp = (appId: UpiAppId): string => {
  const app = UPI_APPS.find((a) => a.id === appId);
  return app ? app.scanScheme : "upi://scan";
};

export const buildUpiQueryString = (params: UpiParams): string => {
  const p = new URLSearchParams();
  p.set("pa", params.payeeVpa);
  p.set("pn", params.payeeName);

  // Only include amount/currency/note/txnRef when a positive amount
  // is provided. `amount: 0` means "open in user-types-amount mode".
  if (params.amount > 0) {
    p.set(
      "am",
      Number.isInteger(params.amount)
        ? String(params.amount)
        : params.amount.toFixed(2),
    );
    p.set("cu", "INR");
    if (params.note) p.set("tn", params.note.slice(0, 50));
    if (params.txnRef)
      p.set("tr", params.txnRef.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35));
  }

  return p.toString();
};

export const buildUpiUriForApp = (appId: UpiAppId, p: UpiParams): string => {
  const qs = buildUpiQueryString(p);
  const app = UPI_APPS.find((a) => a.id === appId);
  return app ? app.scheme(qs) : `upi://pay?${qs}`;
};

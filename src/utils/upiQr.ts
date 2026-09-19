// utils/upiQr.ts

export interface UpiParams {
  payeeVpa: string;         // e.g. 'anmolui@ybl'
  payeeName: string;        // e.g. 'Smart Admin'
  amount: number;           // in rupees
  note?: string;            // optional transaction note
  txnRef?: string;          // optional reference
}

/**
 * Builds a UPI deep-link URI per NPCI spec:
 *   upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 */
export const buildUpiUri = ({
  payeeVpa,
  payeeName,
  amount,
  note,
  txnRef,
}: UpiParams): string => {
  const params = new URLSearchParams();
  params.set('pa', payeeVpa);
  params.set('pn', payeeName);
  params.set('am', amount.toFixed(2));
  params.set('cu', 'INR');
  if (note) params.set('tn', note);
  if (txnRef) params.set('tr', txnRef);
  return `upi://pay?${params.toString()}`;
};

/**
 * Returns an image URL for a QR encoding the UPI URI.
 * Uses the public `api.qrserver.com` service - no API key, no rate limits
 * that matter for our scale.
 *
 * If you'd rather generate QR codes client-side, swap this for a local
 * library (e.g. `qrcode.react`). For now, the public endpoint is enough.
 */
export const buildUpiQrUrl = (
  params: UpiParams,
  size = 240,
): string => {
  const uri = buildUpiUri(params);
  const encoded = encodeURIComponent(uri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8`;
};

export const DEFAULT_UPI = {
  payeeVpa: 'anmolui@ybl',
  payeeName: 'Smart Admin',
  bankAccount: '469801500458',
};
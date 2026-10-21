// src/utils/upiQr.ts

export interface UpiParams {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  note?: string;
  txnRef?: string;
}

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
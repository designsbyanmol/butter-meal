// components/Payments/UpiQrCard.tsx
import React, { useMemo } from 'react';
import { Card, Button } from '../ui';
import { buildUpiQrUrl, DEFAULT_UPI } from '../../utils/upiQr';
import local from './UpiQrCard.module.scss';

interface UpiQrCardProps {
  amount: number;
  note?: string;
  txnRef?: string;
  size?: number;
}

const UpiQrCard: React.FC<UpiQrCardProps> = ({
  amount,
  note,
  txnRef,
  size = 220,
}) => {
  const qrUrl = useMemo(
    () =>
      buildUpiQrUrl(
        {
          payeeVpa: DEFAULT_UPI.payeeVpa,
          payeeName: DEFAULT_UPI.payeeName,
          amount,
          note,
          txnRef,
        },
        size,
      ),
    [amount, note, txnRef, size],
  );

  const copy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card padding="md" className={local.wrap}>
      <div className={local.qrBox}>
        <img src={qrUrl} alt="UPI QR code" width={size} height={size} />
        <div className={local.qrHint}>
          Scan with any UPI app to pay Rs{amount.toFixed(2)}
        </div>
      </div>

      <div className={local.details}>
        <div className={local.detailRow}>
          <span className={local.detailLabel}>Amount</span>
          <span className={local.detailValue}>Rs{amount.toFixed(2)}</span>
        </div>

        <div className={local.detailRow}>
          <span className={local.detailLabel}>UPI ID</span>
          <span className={local.detailValue}>
            {DEFAULT_UPI.payeeVpa}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copy(DEFAULT_UPI.payeeVpa)}
              aria-label="Copy UPI ID"
            >
              Copy
            </Button>
          </span>
        </div>

        <div className={local.detailRow}>
          <span className={local.detailLabel}>Account No.</span>
          <span className={local.detailValue}>
            {DEFAULT_UPI.bankAccount}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copy(DEFAULT_UPI.bankAccount)}
              aria-label="Copy account number"
            >
              Copy
            </Button>
          </span>
        </div>

        {note && (
          <div className={local.detailRow}>
            <span className={local.detailLabel}>For</span>
            <span className={local.detailValue}>{note}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UpiQrCard;
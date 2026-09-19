// components/Payments/UpiQrCard.tsx
import React, { useMemo } from 'react';
import {
  buildUpiQrUrl,
  DEFAULT_UPI,
} from '../../utils/upiQr';
import styles from './UpiQrCard.module.scss';

interface UpiQrCardProps {
  amount: number;
  note?: string;         // e.g., "Dynamic plan . 3 months"
  txnRef?: string;       // invoice short id
  size?: number;         // QR pixel size, default 220
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
    <div className={styles.wrap}>
      <div className={styles.qrBox}>
        <img src={qrUrl} alt="UPI QR code" width={size} height={size} />
        <div className={styles.qrHint}>
          Scan with any UPI app to pay Rs{amount.toFixed(2)}
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Amount</span>
          <span className={styles.detailValue}>Rs{amount.toFixed(2)}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>UPI ID</span>
          <span className={styles.detailValue}>
            {DEFAULT_UPI.payeeVpa}
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copy(DEFAULT_UPI.payeeVpa)}
              aria-label="Copy UPI ID"
            >
              Copy
            </button>
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Account No.</span>
          <span className={styles.detailValue}>
            {DEFAULT_UPI.bankAccount}
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copy(DEFAULT_UPI.bankAccount)}
              aria-label="Copy account number"
            >
              Copy
            </button>
          </span>
        </div>

        {note && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>For</span>
            <span className={styles.detailValue}>{note}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpiQrCard;
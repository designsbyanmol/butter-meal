// components/Payments/InvoiceModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Invoice, Plan } from '../../types';
import { formatRupees } from '../../utils/subscription';
import { planService } from '../../services/plan.service';
import RazorpayCheckout from './RazorpayCheckout';
import UpiQrCard from './UpiQrCard';
import { CloseIcon, DownloadIcon } from '../../assets/svgs';
import styles from './InvoiceModal.module.scss';

export interface InvoiceModalProps {
  isOpen: boolean;
  mode: 'tenant' | 'admin';
  invoice: Invoice | null;
  plan: Plan | null;
  tenantSlug: string;
  tenantName: string;
  onClose: () => void;
  onPaid: (invoice: Invoice) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  mode,
  invoice,
  plan,
  tenantSlug,
  tenantName,
  onClose,
  onPaid,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [localInvoice, setLocalInvoice] = useState<Invoice | null>(invoice);

  useEffect(() => {
    setLocalInvoice(invoice);
    setError('');
    setIsSaving(false);
  }, [invoice]);

  // Reset local copy when the modal is closing
  useEffect(() => {
    if (!isOpen) {
      setLocalInvoice(null);
      setError('');
      setIsSaving(false);
    }
  }, [isOpen]);

  // -----------------------------------------------------------------
  // HARD GUARD - must run before ANY access to `.planId`, `.finalAmount`
  // or any other field on `localInvoice`. Also handles the case where
  // `plan` is null: we can render the invoice fine without it since
  // every amount is already baked into the invoice row.
  // -----------------------------------------------------------------
  if (!isOpen || !localInvoice) return null;

  const handleDownload = () => {
    const inv = localInvoice;
    const planLabel = plan?.name ?? inv.planId;

    const text = [
      `========== INVOICE ==========`,
      ``,
      `Tenant:      ${tenantName} (${tenantSlug})`,
      `Plan:        ${planLabel}`,
      `Duration:    ${inv.months} month${inv.months > 1 ? 's' : ''}`,
      ``,
      `--- Amount ---`,
      `Base:        ${formatRupees(inv.baseAmount)}`,
      inv.baseAmount !== inv.finalAmount
        ? `Credit:      −${formatRupees(inv.baseAmount - inv.finalAmount)}`
        : '',
      `Total:       ${formatRupees(inv.finalAmount)}`,
      ``,
      `--- Payment Details ---`,
      `Account No.: 469801500458`,
      `UPI ID:      anmolui@ybl`,
      ``,
      `Invoice ID:  ${inv.id}`,
      `Created:     ${new Date(inv.createdAt).toLocaleString()}`,
      `Status:      ${inv.status}`,
      ``,
      `Thank you!`,
    ]
      .filter((l) => l !== '')
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${inv.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const handleMarkPaid = async () => {
    if (!localInvoice) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await planService.markInvoicePaid(
        localInvoice.id,
        'super admin',
      );
      if (!updated) throw new Error('Failed to mark invoice paid');

      // Apply the plan change / extension
      await planService.changePlan(
        tenantSlug,
        localInvoice.planId,
        localInvoice.months,
      );

      onPaid(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const planLabel = plan?.name ?? localInvoice.planId;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Invoice</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span>Tenant</span>
              <span>
                {tenantName} <code>{tenantSlug}</code>
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Plan</span>
              <span>
                {planLabel} . {localInvoice.months} month
                {localInvoice.months > 1 ? 's' : ''}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Base amount</span>
              <span>{formatRupees(localInvoice.baseAmount)}</span>
            </div>
            {localInvoice.baseAmount !== localInvoice.finalAmount && (
              <div
                className={`${styles.summaryRow} ${styles.summaryDiscount}`}
              >
                <span>Prorated credit</span>
                <span>
                  −
                  {formatRupees(
                    localInvoice.baseAmount - localInvoice.finalAmount,
                  )}
                </span>
              </div>
            )}
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total payable</span>
              <span>{formatRupees(localInvoice.finalAmount)}</span>
            </div>
          </div>

          <UpiQrCard
            amount={localInvoice.finalAmount}
            note={`${planLabel} . ${localInvoice.months} mo`}
            txnRef={localInvoice.id.slice(0, 8)}
          />

          {error && <div className={styles.errorBanner}>{error}</div>}
        </div>

        <div className={styles.footer}>
          {mode === 'tenant' ? (
            <>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={onClose}
              >
                Close
              </button>
              <RazorpayCheckout
                amount={localInvoice.finalAmount}
                invoiceId={localInvoice.id}
                description={`${planLabel} . ${localInvoice.months} months`}
                action="change"
                tenantSlug={tenantSlug}
                planId={localInvoice.planId}
                months={localInvoice.months}
                onCheckoutSuccess={() => {
                  planService
                    .getInvoiceById(localInvoice.id)
                    .then((inv) => {
                      if (inv) onPaid(inv);
                    });
                  onClose();
                }}
                onCheckoutFailure={(reason) => {
                  if (reason && reason !== 'Payment cancelled') {
                    setError(reason);
                  }
                }}
              >
                {({ start, processing }) => (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={processing}
                    onClick={start}
                  >
                    {processing
                      ? 'Processing...'
                      : `Pay Now ${formatRupees(localInvoice.finalAmount)}`}
                  </button>
                )}
              </RazorpayCheckout>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={handleDownload}
              >
                <DownloadIcon width={18} height={18} fill="#4d4d4d" /> Download
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={isSaving}
                onClick={handleMarkPaid}
              >
                {isSaving ? 'Saving...' : 'Paid / Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
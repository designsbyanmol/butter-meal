// components/Payments/InvoiceModal.tsx
import React, { useEffect, useState } from 'react';
import { Invoice, Plan } from '../../types';
import { formatRupees } from '../../utils/subscription';
import { planService } from '../../services/plan.service';
import { Modal, Button, Banner } from '../ui';
import RazorpayCheckout from './RazorpayCheckout';
import UpiQrCard from './UpiQrCard';
import { DownloadIcon } from '../../assets/svgs';
import local from './InvoiceModal.module.scss';

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

  useEffect(() => {
    if (!isOpen) {
      setLocalInvoice(null);
      setError('');
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen || !localInvoice) return null;

  const planLabel = plan?.name ?? localInvoice.planId;
  const taxPercent = Number(localInvoice.taxPercent ?? 0);
  const taxAmount = Number(localInvoice.taxAmount ?? 0);

  const handleDownload = () => {
    const inv = localInvoice;

    const lines: string[] = [
      `========== INVOICE ==========`,
      ``,
      `Tenant:      ${tenantName} (${tenantSlug})`,
      `Plan:        ${planLabel}`,
      `Duration:    ${inv.months} month${inv.months > 1 ? 's' : ''}`,
      ``,
      `--- Amount ---`,
      `Base:        ${formatRupees(inv.baseAmount)}`,
    ];

    if (inv.baseAmount !== inv.finalAmount) {
      lines.push(
        `Credit:      -${formatRupees(inv.baseAmount - inv.finalAmount - taxAmount)}`,
      );
    }
    if (taxAmount > 0) {
      lines.push(`GST (${taxPercent}%): ${formatRupees(taxAmount)}`);
    }
    lines.push(`Total:       ${formatRupees(inv.finalAmount)}`);
    lines.push(``);
    lines.push(`--- Payment Details ---`);
    lines.push(`Account No.: 469801500458`);
    lines.push(`UPI ID:      anmolui@ybl`);
    lines.push(``);
    lines.push(`Invoice ID:  ${inv.id}`);
    lines.push(`Created:     ${new Date(inv.createdAt).toLocaleString()}`);
    lines.push(`Status:      ${inv.status}`);
    lines.push(``);
    lines.push(`Thank you!`);

    const text = lines.join('\n');

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

  const footerContent =
    mode === 'tenant' ? (
      <>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
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
            <Button onClick={start} loading={processing}>
              {processing
                ? 'Processing...'
                : `Pay Now . ${formatRupees(localInvoice.finalAmount)}`}
            </Button>
          )}
        </RazorpayCheckout>
      </>
    ) : (
      <>
        <Button
          variant="ghost"
          onClick={handleDownload}
          leftIcon={<DownloadIcon width={16} height={16} fill="#4d4d4d" />}
        >
          Download
        </Button>
        <Button onClick={handleMarkPaid} loading={isSaving}>
          {isSaving ? 'Saving...' : 'Paid / Save'}
        </Button>
      </>
    );

  // Amount breakdown lines
  const baseMinusCredit = localInvoice.baseAmount - taxAmount;
  const creditApplied =
    localInvoice.baseAmount !== localInvoice.finalAmount - taxAmount &&
    baseMinusCredit > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice"
      size="md"
      mobileFullScreen
      footer={footerContent}
    >
      <div className={local.summaryCard}>
        <div className={local.summaryRow}>
          <span>Tenant</span>
          <span>{tenantName}</span>
        </div>
        <div className={local.summaryRow}>
          <span>Plan</span>
          <span>
            {planLabel} . {localInvoice.months} month
            {localInvoice.months > 1 ? 's' : ''}
          </span>
        </div>
        <div className={local.summaryRow}>
          <span>Base amount</span>
          <span>{formatRupees(localInvoice.baseAmount)}</span>
        </div>

        {creditApplied && (
          <div className={`${local.summaryRow} ${local.summaryDiscount}`}>
            <span>Prorated credit</span>
            <span>
              -
              {formatRupees(
                localInvoice.baseAmount -
                  (localInvoice.finalAmount - taxAmount),
              )}
            </span>
          </div>
        )}

        {taxAmount > 0 && (
          <div className={local.summaryRow}>
            <span>GST ({taxPercent}%)</span>
            <span>+ {formatRupees(taxAmount)}</span>
          </div>
        )}

        <div className={`${local.summaryRow} ${local.summaryTotal}`}>
          <span>Total payable</span>
          <span>{formatRupees(localInvoice.finalAmount)}</span>
        </div>
      </div>

      <UpiQrCard
        amount={localInvoice.finalAmount}
        note={`${planLabel} . ${localInvoice.months} mo`}
        txnRef={localInvoice.id.slice(0, 8)}
      />

      {error && (
        <Banner
          variant="error"
          inline
          onDismiss={() => setError('')}
          className={local.errorBanner}
        >
          {error}
        </Banner>
      )}
    </Modal>
  );
};

export default InvoiceModal;
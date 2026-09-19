// pages/Signup/Steps/PaymentStep.tsx
import React, { useMemo, useState } from 'react';
import { Plan, DurationMonths, DURATION_OPTIONS } from '../../../../types';
import {
  computePlanPrice,
  formatRupees,
} from '../../../../utils/subscription';
import { planService } from '../../../../services/plan.service';
import RazorpayCheckout from '../../../../components/Payments/RazorpayCheckout';
import styles from '../Signup.module.scss';

interface PaymentStepProps {
  plan: Plan;
  details: {
    storeName: string;
    slug: string;
    ownerName: string;
    ownerPhone: string;
    ownerPassword: string;
  };
  onSuccess: (info: { months: number; expiresAt: string }) => void;
  onBack: () => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({
  plan,
  details,
  onSuccess,
  onBack,
}) => {
  const [months, setMonths] = useState<DurationMonths>(1);
  const [error, setError] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const breakdown = useMemo(
    () => computePlanPrice(plan, months),
    [plan, months],
  );

  const expiresAtIso = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  }, [months]);

  // Reset invoice if the user changes plan/months after it was created.
  // Otherwise a stale invoice amount would be paid.
  const resetInvoice = () => {
    if (invoiceId) setInvoiceId(null);
    setError('');
  };

  const createInvoice = async () => {
    setError('');
    setCreatingInvoice(true);
    try {
      const inv = await planService.createInvoice({
        tenantSlug: details.slug,
        planId: plan.id,
        months: breakdown.months,
        baseAmount: breakdown.baseAmount,
        discountPct: breakdown.discountPct,
        finalAmount: breakdown.finalAmount,
      });
      if (!inv) throw new Error('Could not create invoice');
      setInvoiceId(inv.id);
    } catch (err) {
      console.error('[PaymentStep] createInvoice failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to prepare payment');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleRazorpayFailure = (reason: string) => {
    if (!reason || reason === 'Payment cancelled') return;
    // Clear the invoice so a retry creates a fresh one at the right amount
    setInvoiceId(null);
    setError(reason);
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2>Complete your payment</h2>
        <p>Pick a duration - longer plans get a bigger discount.</p>
      </div>

      <div className={styles.durationGrid}>
        {DURATION_OPTIONS.map((opt) => {
          const p = computePlanPrice(plan, opt.months);
          const active = opt.months === months;
          return (
            <button
              key={opt.months}
              type="button"
              className={`${styles.durationCard} ${
                active ? styles.durationActive : ''
              }`}
              onClick={() => {
                setMonths(opt.months);
                resetInvoice();
              }}
            >
              <span className={styles.durationMonths}>{opt.label}</span>
              <span className={styles.durationPrice}>
                {formatRupees(p.finalAmount)}
              </span>
              {opt.discountPct > 0 && (
                <span className={styles.durationDiscount}>
                  {opt.discountPct}% off
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span>
            {plan.name} x {months} month{months > 1 ? 's' : ''}
          </span>
          <span>{formatRupees(breakdown.baseAmount)}</span>
        </div>
        {breakdown.discountAmount > 0 && (
          <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
            <span>Discount ({breakdown.discountPct}%)</span>
            <span>− {formatRupees(breakdown.discountAmount)}</span>
          </div>
        )}
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>Total payable</span>
          <span>{formatRupees(breakdown.finalAmount)}</span>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.stepActions}>
        <button type="button" className={styles.ghostBtn} onClick={onBack}>
          ← Back
        </button>

        {invoiceId ? (
          <RazorpayCheckout
            amount={breakdown.finalAmount}
            invoiceId={invoiceId}
            description={`${plan.name} plan . ${months} months`}
            prefillName={details.ownerName}
            prefillContact={details.ownerPhone}
            action="signup"
            signupPayload={{
              displayName: details.storeName,
              slug: details.slug,
              ownerPhone: details.ownerPhone,
              ownerName: details.ownerName,
              ownerPassword: details.ownerPassword,
              planId: plan.id,
              months,
            }}
            onCheckoutSuccess={() => {
              onSuccess({ months, expiresAt: expiresAtIso });
            }}
            onCheckoutFailure={handleRazorpayFailure}
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
                  : `Pay ${formatRupees(breakdown.finalAmount)}`}
              </button>
            )}
          </RazorpayCheckout>
        ) : (
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={creatingInvoice}
            onClick={createInvoice}
          >
            {creatingInvoice
              ? 'Preparing...'
              : `Continue to pay ${formatRupees(breakdown.finalAmount)}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentStep;
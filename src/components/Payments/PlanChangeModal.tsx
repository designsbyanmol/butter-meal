// components/Payments/PlanChangeModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plan,
  DurationMonths,
  DURATION_OPTIONS,
} from '../../types';
import { formatRupees } from '../../utils/subscription';
import { planService, PlanChangeQuote } from '../../services/plan.service';
import InvoiceModal from './InvoiceModal';
import { CloseIcon, CheckIcon } from '../../assets/svgs';
import styles from './PlanChangeModal.module.scss';

interface PlanChangeModalProps {
  isOpen: boolean;
  mode: 'tenant' | 'admin';
  tenantSlug: string;
  tenantName: string;
  currentPlanId?: string;
  onClose: () => void;
  onComplete?: () => void;
}

// =========================================================
// Feature bullets per plan - same copy as the signup flow.
// =========================================================
const PLAN_FEATURES: Record<
  string,
  { included: string[]; excluded?: string[] }
> = {
  basic: {
    included: [
      'Menu display only',
      'Editable menu items',
      'Store & product info',
    ],
    excluded: [
      'No WhatsApp ordering',
      'No reviews & ratings',
      'No wishlist',
      'No Edit Fields',
      'No User Management',
    ],
  },
  dynamic: {
    included: [
      'Everything in Basic',
      'WhatsApp ordering',
      'Add-to-cart & cart flow',
      'Custom message on items',
      'Edit Fields & Store Manager',
    ],
    excluded: ['No reviews & ratings', 'No wishlist', 'No User Management'],
  },
  professional: {
    included: [
      'Everything in Dynamic',
      'Reviews & ratings',
      'Wishlist for customers',
      'User Management',
      'Premium setup support',
    ],
  },
};

const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  mode,
  tenantSlug,
  tenantName,
  currentPlanId,
  onClose,
  onComplete,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    currentPlanId ?? null,
  );
  const [months, setMonths] = useState<DurationMonths>(1);

  const [quote, setQuote] = useState<PlanChangeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [invoice, setInvoice] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load plans once
  useEffect(() => {
    if (!isOpen) return;
    setPlansLoading(true);
    planService
      .getAllPlans()
      .then((list) => {
        setPlans(list);
        if (currentPlanId && list.some((p) => p.id === currentPlanId)) {
          setSelectedPlanId(currentPlanId);
        } else if (!selectedPlanId && list.length > 0) {
          setSelectedPlanId(list[0].id);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load plans'),
      )
      .finally(() => setPlansLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentPlanId]);

  // Fetch quote whenever plan or months changes
  useEffect(() => {
    if (!isOpen || !selectedPlanId) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError('');

    planService
      .getPlanChangeQuote(tenantSlug, selectedPlanId, months)
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuoteError(
          err instanceof Error ? err.message : 'Failed to compute price',
        );
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlanId, months, tenantSlug, isOpen]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!selectedPlan || !quote) return;

    // Free change - apply directly, no invoice
    if (quote.finalAmount <= 0) {
      try {
        await planService.changePlan(tenantSlug, selectedPlan.id, quote.months);
        onComplete?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply plan');
      }
      return;
    }

    setIsCreating(true);
    setError('');
    try {
      const inv = await planService.createInvoice({
        tenantSlug,
        planId: selectedPlan.id,
        months: quote.months,
        baseAmount: quote.baseAmount,
        discountPct: 0,
        finalAmount: quote.finalAmount,
      });
      if (!inv) throw new Error('Could not create invoice');
      setInvoice(inv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const quoteKind = quote
    ? quote.isRenewal
      ? 'Renewal'
      : quote.isUpgrade
      ? 'Plan upgrade'
      : quote.isDowngrade
      ? 'Plan downgrade'
      : 'Plan change'
    : '';

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h3>
              {mode === 'admin' ? 'Change Plan' : 'Change / Renew Plan'}
            </h3>
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
            <div className={styles.tenantLine}>
              Store Owner: <strong>{tenantName}</strong>
            </div>

            {plansLoading ? (
              <div className={styles.loading}>Loading plans...</div>
            ) : (
              <>
                {/* -------- Plan cards with feature lists -------- */}
                <div className={styles.planGrid}>
                  {plans.map((plan) => {
                    const isSelected = plan.id === selectedPlanId;
                    const isCurrent = plan.id === currentPlanId;
                    const isProfessional = plan.id === 'professional';
                    const features =
                      PLAN_FEATURES[plan.id] ?? { included: [] };

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        className={[
                          styles.planCard,
                          isSelected ? styles.planCardActive : '',
                          isProfessional ? styles.planCardFeatured : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        {isProfessional && !isCurrent && (
                          <div className={styles.featuredTag}>Popular</div>
                        )}
                        {isCurrent && (
                          <div className={styles.currentTag}>Current</div>
                        )}

                        <div className={styles.planCardHeader}>
                          <div className={styles.planName}>{plan.name}</div>
                          <div className={styles.planPrice}>
                            {formatRupees(plan.monthlyPrice)}
                            <span>/mo</span>
                          </div>
                        </div>

                        {plan.description && (
                          <div className={styles.planDesc}>
                            {plan.description}
                          </div>
                        )}

                        <ul className={styles.planFeatures}>
                          {features.included.map((line, i) => (
                            <li key={`in-${i}`}>
                              <span className={styles.tick}><CheckIcon width={16} height={16} fill="#1e7e34" /></span>
                              {line}
                            </li>
                          ))}
                          {features.excluded?.map((line, i) => (
                            <li
                              key={`ex-${i}`}
                              className={styles.featureExcluded}
                            >
                              <span className={styles.cross}><CloseIcon width={16} height={16} fill="#4d4d4d" /></span>
                              {line}
                            </li>
                          ))}
                        </ul>

                        {isSelected && (
                          <div className={styles.selectedIndicator}>
                            Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* -------- Duration cards -------- */}
                <div className={styles.durationGrid}>
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      className={`${styles.durationCard} ${
                        opt.months === months ? styles.durationActive : ''
                      }`}
                      onClick={() => setMonths(opt.months)}
                    >
                      <span className={styles.durationMonths}>
                        {opt.label}
                      </span>
                      {opt.discountPct > 0 && (
                        <span className={styles.durationDiscount}>
                          {opt.discountPct}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* -------- Quote summary -------- */}
                {quoteLoading && (
                  <div className={styles.summary}>Calculating price...</div>
                )}

                {quoteError && (
                  <div className={styles.errorBanner}>{quoteError}</div>
                )}

                {!quoteLoading && quote && (
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>{quoteKind}</span>
                      <span>
                        {formatRupees(quote.newPlanPrice)} x {quote.months}{' '}
                        mo
                      </span>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Plan base</span>
                      <span>{formatRupees(quote.baseAmount)}</span>
                    </div>

                    {quote.creditAmount > 0 && (
                      <div
                        className={`${styles.summaryRow} ${styles.discountRow}`}
                      >
                        <span>
                          Credit ({quote.remainingDays} unused day
                          {quote.remainingDays === 1 ? '' : 's'})
                        </span>
                        <span>−{formatRupees(quote.creditAmount)}</span>
                      </div>
                    )}

                    {quote.extraDays > 0 && (
                      <div className={styles.summaryRow}>
                        <span>Bonus days added</span>
                        <span>+{quote.extraDays} days</span>
                      </div>
                    )}

                    <div
                      className={`${styles.summaryRow} ${styles.totalRow}`}
                    >
                      <span>Pay today</span>
                      <span>
                        {quote.finalAmount <= 0
                          ? 'Free'
                          : formatRupees(quote.finalAmount)}
                      </span>
                    </div>

                    <div className={styles.expiryLine}>
                      New expiry:{' '}
                      <strong>{formatDate(quote.newExpiresAt)}</strong>
                    </div>
                  </div>
                )}

                {error && <div className={styles.errorBanner}>{error}</div>}
              </>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={
                !selectedPlan || !quote || quoteLoading || isCreating
              }
              onClick={handleGenerate}
            >
              {isCreating
                ? 'Preparing...'
                : quote
                ? quote.finalAmount <= 0
                  ? 'Apply Free Change'
                  : `Generate Invoice . ${formatRupees(quote.finalAmount)}`
                : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>

      <InvoiceModal
        isOpen={invoice !== null}
        mode={mode}
        invoice={invoice}
        plan={selectedPlan}
        tenantSlug={tenantSlug}
        tenantName={tenantName}
        onClose={() => setInvoice(null)}
        onPaid={() => {
          onComplete?.();
          setInvoice(null);
          onClose();
        }}
      />
    </>
  );
};

export default PlanChangeModal;
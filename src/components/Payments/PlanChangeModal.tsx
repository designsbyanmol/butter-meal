// components/Payments/PlanChangeModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Plan, DurationMonths } from '../../types';
import { formatRupees } from '../../utils/subscription';
import { planService, PlanChangeQuote } from '../../services/plan.service';
import { Modal, Button, Banner } from '../ui';
import InvoiceModal from './InvoiceModal';
import BillingToggle from './BillingToggle';
import DurationChips from './DurationChips';
import PlanCard from './PlanCard';
import local from './PlanChangeModal.module.scss';

interface PlanChangeModalProps {
  isOpen: boolean;
  mode: 'tenant' | 'admin';
  tenantSlug: string;
  tenantName: string;
  currentPlanId?: string;
  currentMonths?: number;
  onClose: () => void;
  onComplete?: () => void;
}

const TOGGLE_MONTHLY: DurationMonths = 1;
const TOGGLE_YEARLY: DurationMonths = 12;

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
  const [months, setMonths] = useState<DurationMonths>(TOGGLE_MONTHLY);

  const [quote, setQuote] = useState<PlanChangeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [invoice, setInvoice] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isYearly = months >= 12;

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

  // Fetch quote when plan or months changes
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

  const setBillingMode = (yearly: boolean) => {
    setMonths(yearly ? TOGGLE_YEARLY : TOGGLE_MONTHLY);
    setError('');
  };

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!selectedPlan || !quote) return;

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

  const footerCta = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
      <Button
        disabled={!selectedPlan || !quote || quoteLoading || isCreating}
        loading={isCreating}
        onClick={handleGenerate}
      >
        {quote
          ? quote.finalAmount <= 0
            ? 'Apply Free Change'
            : `Generate Invoice . ${formatRupees(quote.finalAmount)}`
          : 'Generate Invoice'}
      </Button>
    </>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'admin' ? 'Change Plan' : 'Change / Renew Plan'}
        size="md"
        footer={footerCta}
      >
        <div className={local.tenantLine}>
          Store Owner: <strong>{tenantName}</strong>
        </div>

        {plansLoading ? (
          <div className={local.loading}>Loading plans...</div>
        ) : (
          <>
            {/* -------- Billing toggle -------- */}
            <BillingToggle yearly={isYearly} onChange={setBillingMode} />

            {/* -------- Duration chips -------- */}
            <DurationChips
              value={months}
              onChange={(m) => {
                setMonths(m);
                setError('');
              }}
            />

            {/* -------- Plan cards (shared component) -------- */}
            <div className={local.planGrid}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  months={months}
                  selected={plan.id === selectedPlanId}
                  featured={plan.id === 'professional'}
                  blue={plan.id === 'dynamic'}
                  cornerTag={
                    plan.id === currentPlanId ? (
                      <div className={local.cornerTag}>Current</div>
                    ) : undefined
                  }
                  onSelect={() => setSelectedPlanId(plan.id)}
                />
              ))}
            </div>

            {/* -------- Quote summary -------- */}
            {quoteLoading && (
              <div className={local.summary}>Calculating price...</div>
            )}

            {quoteError && (
              <Banner
                variant="error"
                inline
                onDismiss={() => setQuoteError('')}
              >
                {quoteError}
              </Banner>
            )}

            {!quoteLoading && quote && (
              <div className={local.summary}>
                <div className={local.summaryRow}>
                  <span>{quoteKind}</span>
                  <span>
                    {formatRupees(quote.newPlanPrice)} x {quote.months} mo
                  </span>
                </div>

                <div className={local.summaryRow}>
                  <span>Plan base</span>
                  <span>{formatRupees(quote.baseAmount)}</span>
                </div>

                {quote.creditAmount > 0 && (
                  <div
                    className={`${local.summaryRow} ${local.discountRow}`}
                  >
                    <span>
                      Credit ({quote.remainingDays} unused day
                      {quote.remainingDays === 1 ? '' : 's'})
                    </span>
                    <span>-{formatRupees(quote.creditAmount)}</span>
                  </div>
                )}

                {quote.extraDays > 0 && (
                  <div className={local.summaryRow}>
                    <span>Bonus days added</span>
                    <span>+{quote.extraDays} days</span>
                  </div>
                )}

                <div className={`${local.summaryRow} ${local.totalRow}`}>
                  <span>Pay today</span>
                  <span>
                    {quote.finalAmount <= 0
                      ? 'Free'
                      : formatRupees(quote.finalAmount)}
                  </span>
                </div>

                <div className={local.expiryLine}>
                  New expiry: <strong>{formatDate(quote.newExpiresAt)}</strong>
                </div>
              </div>
            )}

            {error && (
              <Banner
                variant="error"
                inline
                onDismiss={() => setError('')}
              >
                {error}
              </Banner>
            )}
          </>
        )}
      </Modal>

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
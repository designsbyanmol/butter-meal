// components/Pages/Signup/Steps/PlanStep.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Plan, DurationMonths, StoreCategory } from "../../../../types";
import { computePlanPrice, formatRupees } from "../../../../utils/subscription";
import { planService } from "../../../../services/plan.service";
import { Button, Card, Skeleton, Banner } from "../../../ui";
import RazorpayCheckout from "../../../Payments/RazorpayCheckout";
import BillingToggle from "../../../Payments/BillingToggle";
import DurationChips from "../../../Payments/DurationChips";
import PlanCard from "../../../Payments/PlanCard";
import { LeftArrowIcon } from "../../../../assets/svgs";
import local from "../Signup.module.scss";

interface PlanStepProps {
  plans: Plan[];
  plansLoading?: boolean;
  plansError?: string;
  details: {
    storeName: string;
    slug: string;
    storeCategory: StoreCategory | "";
    ownerName: string;
    ownerPhone: string;
    ownerPassword: string;
  };
  initialPlanId?: string | null;
  initialMonths?: number;
  onSelectionChange?: (s: {
    planId: string | null;
    months: number;
  }) => void;
  onBack: () => void;
  onPaid: (info: { months: number; expiresAt: string; planId: string }) => void;
}

const DEFAULT_MONTHS: DurationMonths = 1;
const TOGGLE_MONTHLY: DurationMonths = 1;
const TOGGLE_YEARLY: DurationMonths = 12;

const PlanStep: React.FC<PlanStepProps> = ({
  plans,
  plansLoading = false,
  plansError = "",
  details,
  initialPlanId = null,
  initialMonths = 1,
  onSelectionChange,
  onBack,
  onPaid,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    initialPlanId,
  );
  const [months, setMonths] = useState<DurationMonths>(
    (initialMonths as DurationMonths) || DEFAULT_MONTHS,
  );

  const [error, setError] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    onSelectionChange?.({ planId: selectedPlanId, months });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId, months]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const breakdown = useMemo(
    () => (selectedPlan ? computePlanPrice(selectedPlan, months) : null),
    [selectedPlan, months],
  );

  const expiresAtIso = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  }, [months]);

  // 1–6 mo - monthly; 12–24 mo - yearly.
  const isYearly = months >= 12;

  const setBillingMode = (yearly: boolean) => {
    setMonths(yearly ? TOGGLE_YEARLY : TOGGLE_MONTHLY);
    resetInvoice();
  };

  const resetInvoice = () => {
    if (invoiceId) setInvoiceId(null);
    setError("");
  };

  const createInvoice = async () => {
    if (!selectedPlan || !breakdown) return;
    setError("");
    setCreatingInvoice(true);
    try {
      const inv = await planService.createInvoice({
        tenantSlug: details.slug,
        planId: selectedPlan.id,
        months: breakdown.months,
        baseAmount: breakdown.baseAmount,
        discountPct: breakdown.discountPct,
        finalAmount: breakdown.finalAmount,
      });
      if (!inv) throw new Error("Could not create invoice");
      setInvoiceId(inv.id);
    } catch (err) {
      console.error("[PlanStep] createInvoice failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to prepare payment",
      );
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleRazorpayFailure = (reason: string) => {
    if (!reason || reason === "Payment cancelled") return;
    setInvoiceId(null);
    setError(reason);
  };

  if (plansLoading) {
    return (
      <div className={local.stepWrap}>
        <div className={local.stepHeader}>
          <h2>Loading plans...</h2>
          <p>Fetching the latest subscription options for you.</p>
        </div>
        <div className={local.planGrid}>
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="lg" className={local.planSkeleton}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="60%" height={22} />
              <Skeleton width="80%" height={12} />
              <Skeleton width="70%" height={12} />
              <Skeleton width="55%" height={12} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className={local.stepWrap}>
        <div className={local.stepHeader}>
          <h2>Could not load plans</h2>
          <p>{plansError}</p>
        </div>
        <Banner variant="error" inline>
          Please refresh the page or contact support if this persists.
        </Banner>
        <div className={local.stepActions}>
          <Button variant="ghost" onClick={onBack}>
            <LeftArrowIcon width={18} height={18} fill="#4d4d4d" /> Back
          </Button>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className={local.stepWrap}>
        <div className={local.stepHeader}>
          <h2>No plans available</h2>
          <p>
            Subscription plans haven't been configured yet. Please contact
            support.
          </p>
        </div>
        <div className={local.stepActions}>
          <Button variant="ghost" onClick={onBack}>
            <LeftArrowIcon width={18} height={18} fill="#4d4d4d" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={local.stepWrap}>
      <div className={local.stepHeader}>
        <h2>Choose your plan</h2>
        <p>
          Pick a billing period, then select the plan that fits your restaurant.
        </p>
      </div>

      <BillingToggle
        yearly={isYearly}
        onChange={setBillingMode}
        onToggle={resetInvoice}
      />

      <DurationChips
        value={months}
        onChange={(m) => {
          setMonths(m);
          resetInvoice();
        }}
      />

      <div className={local.planGrid}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            months={months}
            selected={plan.id === selectedPlanId}
            featured={plan.id === "professional"}
            blue={plan.id === "dynamic"}
            onSelect={() => {
              setSelectedPlanId(plan.id);
              resetInvoice();
            }}
          />
        ))}
      </div>

      {selectedPlan && breakdown && (
        <Card padding="md" className={local.summaryCard}>
          <div className={local.summaryRow}>
            <span>
              {selectedPlan.name} x {breakdown.months} month
              {breakdown.months > 1 ? "s" : ""}
            </span>
            <span>{formatRupees(breakdown.baseAmount)}</span>
          </div>
          {breakdown.discountAmount > 0 && (
            <div className={`${local.summaryRow} ${local.summaryDiscount}`}>
              <span>Discount ({breakdown.discountPct}%)</span>
              <span>- {formatRupees(breakdown.discountAmount)}</span>
            </div>
          )}
          <div className={`${local.summaryRow} ${local.summaryTotal}`}>
            <span>Total payable</span>
            <span>{formatRupees(breakdown.finalAmount)}</span>
          </div>
        </Card>
      )}

      {error && (
        <Banner
          variant="error"
          inline
          onDismiss={() => setError("")}
          className={local.errorBanner}
        >
          {error}
        </Banner>
      )}

      <div className={local.stepActions}>
        <Button variant="ghost" onClick={onBack}>
          <LeftArrowIcon width={18} height={18} fill="#4d4d4d" /> Back
        </Button>

        {invoiceId && selectedPlan && breakdown ? (
          <RazorpayCheckout
            amount={breakdown.finalAmount}
            invoiceId={invoiceId}
            description={`${selectedPlan.name} plan . ${breakdown.months} months`}
            prefillName={details.ownerName}
            prefillContact={details.ownerPhone}
            action="signup"
            signupPayload={{
              displayName: details.storeName,
              slug: details.slug,
              storeCategory: details.storeCategory || "restaurant",
              ownerPhone: details.ownerPhone,
              ownerName: details.ownerName,
              ownerPassword: details.ownerPassword,
              planId: selectedPlan.id,
              months: breakdown.months,
            }}
            onCheckoutSuccess={() => {
              onPaid({
                months: breakdown.months,
                expiresAt: expiresAtIso,
                planId: selectedPlan.id,
              });
            }}
            onCheckoutFailure={handleRazorpayFailure}
          >
            {({ start, processing }) => (
              <Button onClick={start} loading={processing}>
                {processing
                  ? "Processing..."
                  : `Pay ${formatRupees(breakdown.finalAmount)}`}
              </Button>
            )}
          </RazorpayCheckout>
        ) : (
          <Button
            onClick={createInvoice}
            loading={creatingInvoice}
            disabled={!selectedPlan}
          >
            {creatingInvoice
              ? "Preparing..."
              : selectedPlan && breakdown
                ? `Continue with ${formatRupees(breakdown.finalAmount)}`
                : "Select a plan to continue"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PlanStep;
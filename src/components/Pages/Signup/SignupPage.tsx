// src/components/Pages/Signup/SignupPage.tsx
import React, { useEffect, useState } from "react";
import { Plan } from "../../../types";
import { planService } from "../../../services/plan.service";
import DetailsStep from "./Steps/DetailsStep";
import PlanStep from "./Steps/PlanStep";
import BuildingStep from "./Steps/BuildingStep";
import CredentialsStep from "./Steps/CredentialsStep";
import { useSignupPersistence, clearSignupState } from "./useSignupPersistence";
import { seedNewStoreCatalog } from "../../../utils/seedCatalog";
import local from "./Signup.module.scss";
import { CheckIcon, LeftArrowIcon } from "../../../assets/svgs";

interface VisibleStep {
  index: number;
  label: string;
  sub: string;
  stages: ("details" | "plan" | "building" | "credentials")[];
}

const VISIBLE_STEPS: VisibleStep[] = [
  {
    index: 1,
    label: "Store Details",
    sub: "Name, slug & owner",
    stages: ["details"],
  },
  {
    index: 2,
    label: "Select Plan",
    sub: "Pick a plan & pay",
    stages: ["plan"],
  },
  {
    index: 3,
    label: "Store Setup",
    sub: "Review & confirm",
    stages: ["building", "credentials"],
  },
];

const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp";

const SignupPage: React.FC = () => {
  const { state, patch, patchDetails, reset } = useSignupPersistence();
  const { stage, details, selectedPlanId, months, confirmed } = state;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string>("");

  // ---- Load plans ----
  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    setPlansError("");

    planService
      .getAllPlans()
      .then((list) => {
        if (cancelled) return;
        setPlans(list);
        if (list.length === 0) {
          setPlansError(
            "No plans are available right now. Please contact support.",
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[Signup] plan fetch failed:", err);
        setPlansError(
          err instanceof Error
            ? err.message
            : "Failed to load subscription plans.",
        );
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Auto-skip credentials step if plan/months got clobbered ----
  useEffect(() => {
    if (stage === "credentials" && !confirmed) {
      patch({ stage: "plan" });
    }
    if (stage === "building" && !confirmed) {
      patch({ stage: "plan" });
    }
  }, [stage, confirmed, patch]);

  // ---- Back to home ----
  const handleBackToHome = () => {
    try {
      clearSignupState();
      reset();
    } catch {
      /* ignore */
    }

    const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
    window.location.href = `${window.location.origin}`;
  };

  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  const base = `${window.location.origin}${dir}`;
  const publicUrl = `${base}customer.html?t=${details.slug}`;
  const adminUrl = `${base}admin.html?t=${details.slug}_admin`;

  const activeVisibleIndex =
    VISIBLE_STEPS.findIndex((s) => s.stages.includes(stage)) + 1;

  const confirmedPlan = confirmed
    ? (plans.find((p) => p.id === confirmed.planId) ?? null)
    : null;

  return (
    <div className={local.page}>
      {/* =========================================================
          Page header - back to home on the left, brand logo on the right
         ========================================================= */}
      <div className={local.pageHeader}>
        <button
          type="button"
          className={local.backLink}
          onClick={handleBackToHome}
          aria-label="Back to home"
        >
          <LeftArrowIcon width={18} height={18} fill="#1e1e1e" />
          <span className={local.backLinkText}>Back to home</span>
        </button>

        <img
          src={LOGO_URL}
          alt="Dozzelo"
          className={local.headerLogo}
          draggable={false}
        />
      </div>

      <div className={local.shell}>
        <aside className={local.stepper}>
          <ol className={local.stepperList}>
            {VISIBLE_STEPS.map((s) => {
              const isCompleted = s.index < activeVisibleIndex;
              const isActive = s.index === activeVisibleIndex;
              return (
                <li
                  key={s.index}
                  className={[
                    local.stepperItem,
                    isCompleted ? local.stepCompleted : "",
                    isActive ? local.stepActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={local.stepDot}>
                    {isCompleted ? (
                      <CheckIcon width={16} height={16} fill="#1e7e34" />
                    ) : (
                      s.index
                    )}
                  </div>
                  <div className={local.stepText}>
                    <span className={local.stepLabel}>{s.label}</span>
                    <span className={local.stepSub}>{s.sub}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className={local.stepPanel}>
          {stage === "details" && (
            <DetailsStep
              initial={details}
              onFieldChange={patchDetails}
              onContinue={(d) => {
                patch({ details: d, stage: "plan" });
              }}
            />
          )}

          {stage === "plan" && (
            <PlanStep
              plans={plans}
              plansLoading={plansLoading}
              plansError={plansError}
              details={{
                storeName: details.storeName,
                slug: details.slug,
                storeCategory: details.storeCategory,
                ownerName: details.ownerName,
                ownerPhone: details.ownerPhone,
                ownerPassword: details.ownerPassword,
              }}
              initialPlanId={selectedPlanId}
              initialMonths={months}
              onSelectionChange={({ planId, months }) =>
                patch({ selectedPlanId: planId, months })
              }
              onBack={() => patch({ stage: "details" })}
              onPaid={async (info) => {
                await seedNewStoreCatalog(details.slug, details.storeCategory);
                patch({ confirmed: info, stage: "building" });
              }}
            />
          )}

          {stage === "building" && confirmed && (
            <BuildingStep
              storeName={details.storeName}
              onComplete={() => patch({ stage: "credentials" })}
            />
          )}

          {stage === "credentials" && confirmedPlan && confirmed && (
            <CredentialsStep
              storeName={details.storeName}
              slug={details.slug}
              publicUrl={publicUrl}
              adminUrl={adminUrl}
              phone={details.ownerPhone}
              password={details.ownerPassword}
              planName={confirmedPlan.name}
              months={confirmed.months}
              expiresAtIso={confirmed.expiresAt}
              onDone={() => {
                clearSignupState();
                reset();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default SignupPage;

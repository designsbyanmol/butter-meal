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
import { useNavigationPreloader } from "../../../hooks/useNavigationPreloader";

interface VisibleStep {
  index: number;
  label: string;
  sub: string;
  stages: ("details" | "plan" | "building" | "credentials")[];
}

const VISIBLE_STEPS: VisibleStep[] = [
  {
    index: 1,
    label: "Business Details",
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
    label: "Business Setup",
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

  const nav = useNavigationPreloader({ title: "Loading..." });

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

  useEffect(() => {
    if (stage === "credentials" && !confirmed) {
      patch({ stage: "plan" });
    }
    if (stage === "building" && !confirmed) {
      patch({ stage: "plan" });
    }
  }, [stage, confirmed, patch]);

  // Safety net: if the stage leaves "plan", make sure the preloader
  // is gone. This is redundant with the hide in onPaid but protects
  // against a stuck overlay in any edge case.
  useEffect(() => {
    if (stage !== "plan") {
      nav.hide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleBackToHome = () => {
    try {
      clearSignupState();
      reset();
    } catch {
      /* ignore */
    }
    nav.show(() => {
      window.location.href = `${window.location.origin}`;
    }, "Loading...");
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
              onBack={() => {
                nav.hide();
                patch({ stage: "details" });
              }}
              // Only fired from the "Continue" button (invoice
              // creation), NOT from "Pay". This is what keeps the
              // preloader out of Razorpay's way.
              onBeforePayment={() => {
                nav.showNow("Preparing payment...");
              }}
              onPaymentCancelled={() => {
                nav.hide();
              }}
              onPaid={async (info) => {
                // Payment has succeeded — swap the title and keep
                // the preloader up while the store is being seeded.
                nav.showNow("Setting up your business...");
                try {
                  await seedNewStoreCatalog(
                    details.slug,
                    details.storeCategory,
                  );
                  patch({ confirmed: info, stage: "building" });
                  // The stage useEffect above will hide the loader
                  // once BuildingStep mounts.
                } catch (err) {
                  console.error("[Signup] seed failed:", err);
                  // Fall through anyway — BuildingStep must render
                  // so the user isn't stranded. Even if the seed
                  // failed, the store row + owner exist; the admin
                  // page has its own seed safety net.
                  patch({ confirmed: info, stage: "building" });
                } finally {
                  // Belt-and-braces: if the stage change didn't
                  // trigger (e.g. `confirmed` was already set), kill
                  // the loader explicitly.
                  nav.hide();
                }
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
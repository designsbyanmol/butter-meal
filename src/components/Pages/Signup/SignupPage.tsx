// src/components/Pages/Signup/SignupPage.tsx
import React, { useEffect, useState } from 'react';
import { Plan } from '../../../types';
import { planService } from '../../../services/plan.service';
import DetailsStep from './Steps/DetailsStep';
import PlanStep from './Steps/PlanStep';
import BuildingStep from './Steps/BuildingStep';
import CredentialsStep from './Steps/CredentialsStep';
import {
  useSignupPersistence,
  clearSignupState,
  DEFAULT_SIGNUP_STATE,
} from './useSignupPersistence';
import local from './Signup.module.scss';
import { CheckIcon } from '../../../assets/svgs';

interface VisibleStep {
  index: number;
  label: string;
  sub: string;
  stages: ('details' | 'plan' | 'building' | 'credentials')[];
}

const VISIBLE_STEPS: VisibleStep[] = [
  {
    index: 1,
    label: 'Store Details',
    sub: 'Name, slug & owner',
    stages: ['details'],
  },
  {
    index: 2,
    label: 'Select Plan',
    sub: 'Pick a plan & pay',
    stages: ['plan'],
  },
  {
    index: 3,
    label: 'Store Setup',
    sub: 'Review & confirm',
    stages: ['building', 'credentials'],
  },
];

const SignupPage: React.FC = () => {
  const { state, patch, patchDetails, reset } = useSignupPersistence();
  const {
    stage,
    details,
    selectedPlanId,
    months,
    confirmed,
  } = state;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string>('');

  // ---- Load plans ----
  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    setPlansError('');

    planService
      .getAllPlans()
      .then((list) => {
        if (cancelled) return;
        setPlans(list);
        if (list.length === 0) {
          setPlansError(
            'No plans are available right now. Please contact support.',
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[Signup] plan fetch failed:', err);
        setPlansError(
          err instanceof Error
            ? err.message
            : 'Failed to load subscription plans.',
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
    if (stage === 'credentials' && !confirmed) {
      patch({ stage: 'plan' });
    }
    if (stage === 'building' && !confirmed) {
      patch({ stage: 'plan' });
    }
  }, [stage, confirmed, patch]);

  const origin = window.location.origin + window.location.pathname;
  const publicUrl = `${origin}?t=${details.slug}`;
  const adminUrl = `${origin}?t=${details.slug}_admin`;

  const activeVisibleIndex =
    VISIBLE_STEPS.findIndex((s) => s.stages.includes(stage)) + 1;

  const confirmedPlan = confirmed
    ? plans.find((p) => p.id === confirmed.planId) ?? null
    : null;

  return (
    <div className={local.page}>
      <header className={local.pageHeader}>
        <h1 className={local.pageTitle}>Teckut Digital Menu</h1>
        <p className={local.pageSubtitle}>
          Follow the simple 3 steps below to set up your store, choose a plan,
          and start taking orders.
        </p>
      </header>

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
                    isCompleted ? local.stepCompleted : '',
                    isActive ? local.stepActive : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
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
          {stage === 'details' && (
            <DetailsStep
              initial={details}
              onFieldChange={patchDetails}
              onContinue={(d) => {
                patch({ details: d, stage: 'plan' });
              }}
            />
          )}

          {stage === 'plan' && (
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
              onBack={() => patch({ stage: 'details' })}
              onPaid={(info) => {
                patch({ confirmed: info, stage: 'building' });
              }}
            />
          )}

          {stage === 'building' && confirmed && (
            <BuildingStep
              storeName={details.storeName}
              onComplete={() => patch({ stage: 'credentials' })}
            />
          )}

          {stage === 'credentials' && confirmedPlan && confirmed && (
            <CredentialsStep
              storeName={details.storeName}
              publicUrl={publicUrl}
              adminUrl={adminUrl}
              phone={details.ownerPhone}
              password={details.ownerPassword}
              planName={confirmedPlan.name}
              months={confirmed.months}
              expiresAtIso={confirmed.expiresAt}
              onDone={() => {
                // Fully reset after the user acknowledges.
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
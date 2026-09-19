// pages/Signup/SignupPage.tsx
import React, { useEffect, useState } from 'react';
import { Plan } from '../../../types';
import { planService } from '../../../services/plan.service';
import DetailsStep, { SignupDetails } from './Steps/DetailsStep';
import PlanStep from './Steps/PlanStep';
import PaymentStep from './Steps/PaymentStep';
import BuildingStep from './Steps/BuildingStep';
import CredentialsStep from './Steps/CredentialsStep';
import styles from './Signup.module.scss';

type SignupStage =
  | 'details'
  | 'plan'
  | 'payment'
  | 'building'
  | 'credentials';

const SignupPage: React.FC = () => {
  const [stage, setStage] = useState<SignupStage>('details');
  const [details, setDetails] = useState<SignupDetails>({
    storeName: '',
    slug: '',
    ownerName: '',
    ownerPhone: '',
    ownerPassword: '',
    confirmPassword: '',
  });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string>('');

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [confirmed, setConfirmed] = useState<{
    months: number;
    expiresAt: string;
  } | null>(null);

  // ---- Load plans once on mount ----
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

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  const origin = window.location.origin + window.location.pathname;
  const publicUrl = `${origin}?t=${details.slug}`;
  const adminUrl = `${origin}?t=${details.slug}_admin`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.brand}>Smart Admin - Sign up</div>
        <div className={styles.stageBar}>
          {(['details', 'plan', 'payment'] as SignupStage[]).map((s, i) => {
            const stageIndex = ['details', 'plan', 'payment', 'building', 'credentials'].indexOf(stage);
            const thisIndex = i;
            const isActive = thisIndex <= stageIndex && stageIndex < 3;
            return (
              <div
                key={s}
                className={`${styles.stageDot} ${
                  isActive ? styles.stageDotActive : ''
                }`}
              >
                <span>{i + 1}</span>
                <label>
                  {s === 'details'
                    ? 'Details'
                    : s === 'plan'
                    ? 'Plan'
                    : 'Payment'}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.body}>
        {stage === 'details' && (
          <DetailsStep
            initial={details}
            onContinue={(d) => {
              setDetails(d);
              setStage('plan');
            }}
          />
        )}

        {stage === 'plan' && (
          <PlanStep
            plans={plans}
            plansLoading={plansLoading}
            plansError={plansError}
            selectedPlanId={selectedPlanId}
            onSelect={setSelectedPlanId}
            onContinue={() => setStage('payment')}
            onBack={() => setStage('details')}
          />
        )}

        {stage === 'payment' && selectedPlan && (
          <PaymentStep
            plan={selectedPlan}
            details={{
              storeName: details.storeName,
              slug: details.slug,
              ownerName: details.ownerName,
              ownerPhone: details.ownerPhone,
              ownerPassword: details.ownerPassword,
            }}
            onSuccess={(info) => {
              setConfirmed(info);
              setStage('building');
            }}
            onBack={() => setStage('plan')}
          />
        )}

        {stage === 'building' && (
          <BuildingStep
            storeName={details.storeName}
            onComplete={() => setStage('credentials')}
          />
        )}

        {stage === 'credentials' && selectedPlan && confirmed && (
          <CredentialsStep
            storeName={details.storeName}
            publicUrl={publicUrl}
            adminUrl={adminUrl}
            phone={details.ownerPhone}
            password={details.ownerPassword}
            planName={selectedPlan.name}
            months={confirmed.months}
            expiresAtIso={confirmed.expiresAt}
          />
        )}
      </div>
    </div>
  );
};

export default SignupPage;
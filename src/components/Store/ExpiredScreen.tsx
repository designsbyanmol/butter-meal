// components/Store/ExpiredScreen.tsx
import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import PlanChangeModal from '../Payments/PlanChangeModal';
import styles from './PausedScreen.module.scss';

const ExpiredScreen: React.FC = () => {
  const { tenant, refreshTenant } = useTenant();
  const [isRenewOpen, setIsRenewOpen] = useState(false);

  if (!tenant) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon}>⏰</div>
        <h1>Plan expired</h1>
        <p>
          Your <strong>{tenant.planName ?? 'subscription'}</strong> plan for{' '}
          <strong>{tenant.displayName}</strong> has expired.
        </p>
        <p className={styles.note}>
          Renew to reactivate your store. Choose a duration and pay via
          Razorpay.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setIsRenewOpen(true)}
          >
            Renew Now
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => setIsRenewOpen(true)}
          >
            Change Plan
          </button>
        </div>
      </div>

      {isRenewOpen && (
        <PlanChangeModal
          isOpen={true}
          mode="tenant"
          tenantSlug={tenant.slug}
          tenantName={tenant.displayName}
          currentPlanId={tenant.planId}
          onClose={() => setIsRenewOpen(false)}
          onComplete={() => {
            refreshTenant();
            setIsRenewOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ExpiredScreen;
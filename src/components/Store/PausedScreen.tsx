// components/Store/PausedScreen.tsx
import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import PlanChangeModal from '../Payments/PlanChangeModal';
import styles from './PausedScreen.module.scss';

const PausedScreen: React.FC = () => {
  const { tenant, refreshTenant } = useTenant();
  const [isRenewOpen, setIsRenewOpen] = useState(false);

  if (!tenant) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon}>⏸️</div>
        <h1>Store paused</h1>
        <p>
          Your store <strong>{tenant.displayName}</strong> has been paused.
          Customers can't see the menu until you renew.
        </p>
        <p className={styles.note}>
          Note: any remaining days from the paused plan are forfeited. You'll
          pay full price for a new cycle.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setIsRenewOpen(true)}
          >
            Renew Existing Plan
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

export default PausedScreen;
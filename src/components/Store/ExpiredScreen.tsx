// components/Store/ExpiredScreen.tsx
import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { Card, Button } from '../ui';
import PlanChangeModal from '../Payments/PlanChangeModal';
import local from './PausedScreen.module.scss';

const ExpiredScreen: React.FC = () => {
  const { tenant, refreshTenant } = useTenant();
  const [isRenewOpen, setIsRenewOpen] = useState(false);

  if (!tenant) return null;

  return (
    <div className={local.wrap}>
      <Card padding="lg" className={local.card}>
        <div className={local.icon}>⏰</div>
        <h1>Plan expired</h1>
        <p>
          Your <strong>{tenant.planName ?? 'subscription'}</strong> plan for{' '}
          <strong>{tenant.displayName}</strong> has expired.
        </p>
        <p className={local.note}>
          Renew to reactivate your store. Choose a duration and pay via
          Razorpay.
        </p>

        <div className={local.actions}>
          <Button onClick={() => setIsRenewOpen(true)}>Renew Now</Button>
          <Button variant="ghost" onClick={() => setIsRenewOpen(true)}>
            Change Plan
          </Button>
        </div>
      </Card>

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
// components/Store/PausedScreen.tsx
import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { Card, Button } from '../ui';
import PlanChangeModal from '../Payments/PlanChangeModal';
import local from './PausedScreen.module.scss';

const PausedScreen: React.FC = () => {
  const { tenant, refreshTenant } = useTenant();
  const [isRenewOpen, setIsRenewOpen] = useState(false);

  if (!tenant) return null;

  return (
    <div className={local.wrap}>
      <Card padding="lg" className={local.card}>
        <div className={local.icon}>⏸️</div>
        <h1>Store paused</h1>
        <p>
          Your store <strong>{tenant.displayName}</strong> has been paused.
          Customers can't see the menu until you renew.
        </p>
        <p className={local.note}>
          Note: any remaining days from the paused plan are forfeited. You'll
          pay full price for a new cycle.
        </p>

        <div className={local.actions}>
          <Button onClick={() => setIsRenewOpen(true)}>
            Renew Existing Plan
          </Button>
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

export default PausedScreen;
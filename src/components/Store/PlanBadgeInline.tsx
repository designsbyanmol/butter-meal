// components/Store/PlanBadgeInline.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { Badge } from '../ui';
import local from './PlanBadgeInline.module.scss';

interface PlanBadgeInlineProps {
  onClick?: () => void;
}

type PlanTone = 'info' | 'warning' | 'success';
type StatusTone = 'success' | 'warning' | 'danger';

const planTone = (planId?: string): PlanTone => {
  if (planId === 'basic') return 'info';
  if (planId === 'dynamic') return 'warning';
  return 'success';
};

const PlanBadgeInline: React.FC<PlanBadgeInlineProps> = ({ onClick }) => {
  const { tenant } = useTenant();
  if (!tenant) return null;

  const planName = tenant.planName ?? 'Professional';
  const status = tenant.subscriptionStatus ?? 'active';
  const days = tenant.daysUntilExpiry ?? Infinity;

  const statusLabel =
    status === 'paused'
      ? 'Paused'
      : status === 'expired' || (typeof days === 'number' && days < 0)
      ? 'Expired'
      : 'Active';

  const statusTone: StatusTone =
    status === 'paused'
      ? 'warning'
      : status === 'expired' || (typeof days === 'number' && days < 0)
      ? 'danger'
      : 'success';

  return (
    <button
      type="button"
      className={local.wrap}
      onClick={onClick}
      title={`${planName} . ${statusLabel}`}
    >
      <Badge tone={planTone(tenant.planId)} size="sm">
        {planName}
      </Badge>
      <Badge tone={statusTone} size="sm">
        {statusLabel}
      </Badge>
    </button>
  );
};

export default PlanBadgeInline;
// components/Store/PlanBadgeInline.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import styles from './PlanBadgeInline.module.scss';

interface PlanBadgeInlineProps {
  onClick?: () => void;
}

const PlanBadgeInline: React.FC<PlanBadgeInlineProps> = ({ onClick }) => {
  const { tenant } = useTenant();
  if (!tenant) return null;

  const planName = tenant.planName ?? 'Professional';
  const status = tenant.subscriptionStatus ?? 'active';
  const days = tenant.daysUntilExpiry ?? Infinity;

  const planClass =
    tenant.planId === 'basic'
      ? styles.planBasic
      : tenant.planId === 'dynamic'
      ? styles.planDynamic
      : styles.planProfessional;

  const statusClass =
    status === 'paused'
      ? styles.statusPaused
      : status === 'expired' || (typeof days === 'number' && days < 0)
      ? styles.statusExpired
      : styles.statusActive;

  const statusLabel =
    status === 'paused'
      ? 'Paused'
      : status === 'expired' || (typeof days === 'number' && days < 0)
      ? 'Expired'
      : 'Active';

  return (
    <button
      type="button"
      className={styles.wrap}
      onClick={onClick}
      title={`${planName} . ${statusLabel}`}
    >
      <span className={`${styles.planChip} ${planClass}`}>{planName}</span>
      <span className={`${styles.statusChip} ${statusClass}`}>
        {statusLabel}
      </span>
    </button>
  );
};

export default PlanBadgeInline;
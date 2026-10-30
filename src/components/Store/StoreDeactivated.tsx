// components/Store/StoreDeactivated.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import local from './Store.module.scss';

interface StoreDeactivatedProps {
  className?: string;
}

const StoreDeactivated: React.FC<StoreDeactivatedProps> = ({ className }) => {
  const { tenant } = useTenant();

  return (
    <div
      className={[local.closedCard, local.deactivatedBanner, className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className={local.closedIcon} aria-hidden>
        <span className={local.closedIconDot} />
      </div>

      <div className={local.closedBody}>
        <h3 className={local.closedTitle}>Store currently unavailable</h3>
        <p className={local.closedSubtitle}>
          {tenant ? tenant.displayName : 'This store'} is not accepting orders
          right now. Please check back later or contact the store directly.
        </p>
      </div>
    </div>
  );
};

export default StoreDeactivated;
// components/Store/StoreDeactivated.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { TrashIcon } from '../../assets/svgs';
import local from './Store.module.scss';

interface StoreDeactivatedProps {
  className?: string;
}

const StoreDeactivated: React.FC<StoreDeactivatedProps> = ({ className }) => {
  const { tenant } = useTenant();

  return (
    <div
      className={[
        local.storeBanner,
        local.deactivatedBanner,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={local.bannerContent}>
        <div className={local.bannerIcon}>
          <TrashIcon width={44} height={44} />
        </div>
        <p className={local.tagLine}>Currently Unavailable</p>
        <div className={local.bannerText}>
          <div className={local.heading}>
            {tenant ? tenant.displayName : 'This store'} is not accepting
            orders right now.
          </div>
          <h3>Please check back later.</h3>
          <div className={local.p}>
            For urgent enquiries, please contact the store directly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDeactivated;
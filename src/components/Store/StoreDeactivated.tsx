// components/Store/StoreDeactivated.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import styles from './Store.module.scss';
import { TrashIcon } from '../../assets/svgs';

interface StoreDeactivatedProps {
  className?: string;
}

const StoreDeactivated: React.FC<StoreDeactivatedProps> = ({ className }) => {
  const { tenant } = useTenant();

  return (
    <div className={`${styles.storeBanner} ${styles.deactivatedBanner} ${className || ''}`}>
      <div className={styles.bannerContent}>
        <div className={styles.bannerIcon}><TrashIcon width={44} height={44} /></div>
        <p className={styles.tagLine}>Currently Unavailable</p>
        <div className={styles.bannerText}>
          <div className={styles.heading}>
            {tenant ? tenant.displayName : 'This store'} is not accepting
            orders right now.
          </div>
          <h3>Please check back later.</h3>
          <div className={styles.p}>
            For urgent enquiries, please contact the store directly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDeactivated;
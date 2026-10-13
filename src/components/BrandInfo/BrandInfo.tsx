// components/BrandInfo/BrandInfo.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import StoreBannerImage from '../Store/StoreBannerImage';
import styles from './BrandInfo.module.scss';

interface BrandInfoProps {
  brandName: string;
  brandDesc?: string;
  /** Hide the store banner image (used on the admin dashboard). */
  hideBanner?: boolean;
}

const BrandInfo: React.FC<BrandInfoProps> = ({
  brandName,
  brandDesc,
  hideBanner = false,
}) => {
  const { tenant } = useTenant();
  const tagline = tenant?.storeTagline ?? brandDesc;

  return (
    <div className={styles.brandWrap}>
      <h1>{brandName}</h1>
      {tagline && (
        <div className={styles.subhead}>
          <span>{tagline}</span>
        </div>
      )}
      {!hideBanner && <StoreBannerImage />}
    </div>
  );
};

export default BrandInfo;
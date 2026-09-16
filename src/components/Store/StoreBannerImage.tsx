// components/Store/StoreBannerImage.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import styles from './StoreBannerImage.module.scss';

interface StoreBannerImageProps {
  className?: string;
}

const StoreBannerImage: React.FC<StoreBannerImageProps> = ({ className }) => {
  const { tenant } = useTenant();

  if (!tenant?.bannerUrl) return null;

  return (
    <div className={`${styles.bannerWrap} ${className ?? ''}`}>
      <img
        src={tenant.bannerUrl}
        alt={`${tenant.displayName} banner`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

export default StoreBannerImage;
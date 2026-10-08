// src/components/Store/StoreBannerImage.tsx
import React, { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { getCategoryDefaults } from '../../data/storeDefaults';
import styles from './StoreBannerImage.module.scss';

interface StoreBannerImageProps {
  className?: string;
}

const StoreBannerImage: React.FC<StoreBannerImageProps> = ({ className }) => {
  const { tenant } = useTenant();

  // Category default - used as the initial value when the tenant has no
  // banner, and as a safety fallback if the tenant URL fails to load.
  const fallback = getCategoryDefaults(tenant?.storeCategory).bannerUrl;
  const primarySrc = tenant?.bannerUrl || fallback || '';

  const [src, setSrc] = useState<string>(primarySrc);

  // Whenever the tenant's banner changes (e.g. after an upload + refresh),
  // resync the visible source.
  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  if (!src) return null;

  return (
    <div className={`${styles.bannerWrap} ${className ?? ''}`}>
      <img
        src={src}
        alt={`${tenant?.displayName ?? 'Store'} banner`}
        loading="lazy"
        decoding="async"
        onError={() => {
          // If the tenant banner fails to load and we aren't already on
          // the category fallback, swap to it so something still shows.
          if (fallback && src !== fallback) setSrc(fallback);
        }}
      />
    </div>
  );
};

export default StoreBannerImage;
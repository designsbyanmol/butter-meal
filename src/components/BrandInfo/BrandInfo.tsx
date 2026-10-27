// src/components/BrandInfo/BrandInfo.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import StoreBannerImage from '../Store/StoreBannerImage';
import styles from './BrandInfo.module.scss';

interface BrandInfoProps {
  brandName: string;
  brandDesc?: string;
  /**
   * Hide the store banner image. Used by the admin dashboard where
   * the shell already provides a hero area - avoids duplicating the
   * visual. NEVER pass `true` on the customer menu.
   */
  hideBanner?: boolean;
}

/**
 * The customer-facing brand block:
 *
 *   ┌──────────────────────────────┐
 *   │  STORE NAME                  │  ← brandName (from tenant.displayName)
 *   │  Tagline / category line     │  ← brandDesc (tenant.storeTagline)
 *   │  ┌────────────────────────┐  │
 *   │  │                        │  │
 *   │  │   Banner image         │  │  ← StoreBannerImage
 *   │  │                        │  │
 *   │  └────────────────────────┘  │
 *   └──────────────────────────────┘
 *
 * The component always renders the banner unless `hideBanner === true`.
 * On the customer menu, `hideBanner` is never set, so the banner is
 * always visible whenever the tenant has one (or a category default).
 */
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
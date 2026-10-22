// src/components/Store/StoreBanner.tsx
import React from 'react';
import { useStore } from '../../contexts/StoreContext';
import local from './Store.module.scss';

interface StoreBannerProps {
  className?: string;
}

/**
 * Renders a large "we're closed" card when the store is not open.
 *
 * Self-gates on `isStoreOpen` from StoreContext, so it's safe to
 * mount unconditionally in AppContent — it will return null when
 * the store is open.
 *
 * The displayed message uses:
 *   - `closedMessage` (owner-set) when present
 *   - Otherwise a generic "opening soon" fallback
 *
 * The expected open date/time, when set by the owner, is shown in a
 * styled chip at the bottom of the banner.
 */
const StoreBanner: React.FC<StoreBannerProps> = ({ className }) => {
  const { storeSettings, isStoreOpen } = useStore();

  if (isStoreOpen) return null;

  const customMessage = storeSettings.closedMessage?.trim() ?? '';

  const hasDate = !!storeSettings.expectedOpenDate;
  const hasTime = !!storeSettings.expectedOpenTime;

  return (
    <div
      className={[local.storeBanner, className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={local.bannerContent}>
        <div className={local.bannerIcon}>Sorry!</div>

        <p className={local.tagLine}>We are closed right now. Opening soon...</p>

        <div className={local.bannerText}>
          <div className={local.heading}>Reason:</div>

          <h3>
            {customMessage || "We'll be back shortly"}
          </h3>

          <div className={local.p}>
            {(hasDate || hasTime) && (
              <>
                Expected to open
                {hasDate && hasTime ? ' on ' : hasDate ? ' on ' : ' at '}
                {hasDate && (
                  <span>{storeSettings.expectedOpenDate}</span>
                )}
                {hasDate && hasTime && ' at '}
                {hasTime && (
                  <span>{storeSettings.expectedOpenTime}</span>
                )}
              </>
            )}
            {!hasDate && !hasTime && 'Please check back soon!'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreBanner;
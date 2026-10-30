// src/components/Store/StoreBanner.tsx
import React, { useEffect, useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { ClockIcon } from '../../assets/svgs';
import local from './Store.module.scss';

interface StoreBannerProps {
  className?: string;
}

const StoreBanner: React.FC<StoreBannerProps> = ({ className }) => {
  const { storeSettings, isStoreOpen } = useStore();

  const [now, setNow] = useState(() => Date.now());

  // Only tick while the banner is visible.
  useEffect(() => {
    if (isStoreOpen) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [isStoreOpen]);

  if (isStoreOpen) return null;

  const customMessage = storeSettings.closedMessage?.trim() ?? '';
  const hasDate = !!storeSettings.expectedOpenDate;
  const hasTime = !!storeSettings.expectedOpenTime;

  let reopenLine: string | null = null;
  let reopenSub: string | null = null;

  if (hasDate && hasTime) {
    const target = new Date(
      `${storeSettings.expectedOpenDate}T${storeSettings.expectedOpenTime}`,
    );
    if (!Number.isNaN(target.getTime())) {
      const diffMs = target.getTime() - now;
      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const totalMin = Math.floor(diffMs / 60_000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        reopenLine =
          h > 0
            ? `Reopens in ${h}h${m ? ` ${m}m` : ''}`
            : `Reopens in ${m}m`;
        reopenSub = target.toLocaleString('en-IN', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
      } else {
        reopenLine = 'Reopens';
        reopenSub = target.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }
    }
  } else if (hasDate) {
    reopenLine = 'Reopens on';
    reopenSub = storeSettings.expectedOpenDate;
  } else if (hasTime) {
    reopenLine = 'Reopens at';
    reopenSub = storeSettings.expectedOpenTime;
  }

  return (
    <div
      className={[local.closedCard, className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="alert"
      aria-live="assertive"
    >
      {/* Colored accent bar (left edge) */}
      <span className={local.closedAccent} aria-hidden />

      <div className={local.closedIcon} aria-hidden>
        <ClockIcon width={22} height={22} fill="#a62d2d" />
      </div>

      <div className={local.closedBody}>
        <span className={local.closedEyebrow}>Store is closed</span>

        <h3 className={local.closedTitle}>
          {customMessage || "We're temporarily closed"}
        </h3>

        <p className={local.closedSubtitle}>
          Ordering has been paused. Please check back soon.
        </p>

        {reopenLine && (
          <div className={local.closedReopen}>
            <span className={local.closedReopenLabel}>{reopenLine}</span>
            {reopenSub && (
              <span className={local.closedReopenValue}>{reopenSub}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreBanner;
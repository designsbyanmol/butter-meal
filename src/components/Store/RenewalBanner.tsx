// components/Store/RenewalBanner.tsx
import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { planService } from '../../services/plan.service';
import PlanChangeModal from '../Payments/PlanChangeModal';
import styles from './RenewalBanner.module.scss';

interface RenewalBannerProps {
  onRefresh?: () => void;
}

const RenewalBanner: React.FC<RenewalBannerProps> = ({ onRefresh }) => {
  const { tenant, refreshTenant } = useTenant();
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isPauseSending, setIsPauseSending] = useState(false);
  const [showRenewInfo, setShowRenewInfo] = useState(false);

  if (!tenant) return null;
  const days = tenant.daysUntilExpiry ?? Infinity;
  const status = tenant.subscriptionStatus ?? 'active';

  // Only show for active plans with <= 7 days left
  const isExpiringSoon = status === 'active' && days <= 7 && days >= 0;
  if (!isExpiringSoon) return null;

  const handlePause = async () => {
    if (
      !window.confirm(
        'Request admin to pause this store? The store will be deactivated once approved. Your remaining plan days will be forfeited upon renewal.',
      )
    )
      return;
    setIsPauseSending(true);
    const ok = await planService.requestPause(tenant.slug);
    setIsPauseSending(false);
    if (ok) {
      await refreshTenant();
      onRefresh?.();
    } else {
      alert('Failed to send pause request');
    }
  };

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.icon}>⚠️</div>
        <div className={styles.content}>
          <div className={styles.title}>
            Your plan expires in {days} day{days === 1 ? '' : 's'}
          </div>
          <div className={styles.subtitle}>
            Renew now to keep your store running. If it expires, your store
            will be paused automatically.
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setShowRenewInfo(true)}
          >
            Renew
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            disabled={isPauseSending || tenant.pauseRequested}
            onClick={handlePause}
          >
            {tenant.pauseRequested
              ? 'Pause requested'
              : isPauseSending
              ? 'Sending...'
              : 'Pause'}
          </button>
        </div>
      </div>

      {/* Renew popup */}
      {showRenewInfo && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setShowRenewInfo(false)}
        >
          <div
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Renew your plan</h3>
            <p className={styles.dialogText}>
              Pick a duration and pay via Razorpay, or switch to a different
              plan entirely. You can also let support handle it - reach out
              from the Info popup.
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setShowRenewInfo(false)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  setShowRenewInfo(false);
                  setIsChangePlanOpen(true);
                }}
              >
                Renew / Change Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {isChangePlanOpen && (
        <PlanChangeModal
          isOpen={true}
          mode="tenant"
          tenantSlug={tenant.slug}
          tenantName={tenant.displayName}
          currentPlanId={tenant.planId}
          onClose={() => setIsChangePlanOpen(false)}
          onComplete={() => {
            refreshTenant();
            onRefresh?.();
          }}
        />
      )}
    </>
  );
};

export default RenewalBanner;
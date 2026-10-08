// components/Store/RenewalBanner.tsx
import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { planService } from '../../services/plan.service';
import { Banner, Button, Modal } from '../ui';
import PlanChangeModal from '../Payments/PlanChangeModal';
import local from './RenewalBanner.module.scss';

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
      <Banner
        variant="warning"
        icon={<span className={local.icon}>⚠️</span>}
        className={local.banner}
      >
        <div className={local.body}>
          <div className={local.content}>
            <div className={local.title}>
              Your plan expires in {days} day{days === 1 ? '' : 's'}
            </div>
            <div className={local.subtitle}>
              Renew now to keep your store running. If it expires, your store
              will be paused automatically.
            </div>
          </div>
          <div className={local.actions}>
            <Button
              size="sm"
              variant="warning"
              onClick={() => setShowRenewInfo(true)}
            >
              Renew
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPauseSending || tenant.pauseRequested}
              onClick={handlePause}
            >
              {tenant.pauseRequested
                ? 'Pause requested'
                : isPauseSending
                ? 'Sending...'
                : 'Pause'}
            </Button>
          </div>
        </div>
      </Banner>

      {/* ---- Renew info dialog ---- */}
      <Modal
        isOpen={showRenewInfo}
        onClose={() => setShowRenewInfo(false)}
        title="Renew your plan"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowRenewInfo(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowRenewInfo(false);
                setIsChangePlanOpen(true);
              }}
            >
              Renew / Change Plan
            </Button>
          </>
        }
      >
        <p className={local.dialogText}>
          Pick a duration and pay via Razorpay, or switch to a different plan
          entirely. You can also let support handle it - reach out from the
          Info popup.
        </p>
      </Modal>

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
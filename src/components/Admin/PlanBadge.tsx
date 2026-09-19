// components/Admin/PlanBadge.tsx - full file (only the parts that changed are marked)

import React, { useState } from 'react';
import { Tenant } from '../../contexts/TenantContext';
import { formatRupees } from '../../utils/subscription';
import { CloseIcon } from '../../assets/svgs';
import styles from './TenantManager.module.scss';

interface PlanBadgeProps {
  tenant: Tenant;
  onChangePlan: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  dynamic: 'Dynamic',
  professional: 'Professional',
};

const PLAN_MONTHLY: Record<string, number> = {
  basic: 99,
  dynamic: 199,
  professional: 499,
};

const PlanBadge: React.FC<PlanBadgeProps> = ({ tenant, onChangePlan }) => {
  const [isOpen, setIsOpen] = useState(false);

  const planId = tenant.planId ?? 'professional';
  const planName = tenant.planName ?? PLAN_LABELS[planId] ?? planId;
  const status = tenant.subscriptionStatus ?? 'active';

  const badgeClass =
    {
      basic: styles.planBasic,
      dynamic: styles.planDynamic,
      professional: styles.planProfessional,
    }[planId] ?? styles.planBasic;

  const statusClass =
    status === 'active'
      ? styles.statusActive
      : status === 'paused'
      ? styles.statusPaused
      : styles.statusExpired;

  return (
    <>
      <button
        type="button"
        className={`${styles.planBadge} ${badgeClass}`}
        onClick={() => setIsOpen(true)}
        title={`${planName} . ${status}`}
      >
        {planName}
      </button>

      {isOpen && (
        <div
          className={styles.planDialogOverlay}
          onClick={() => setIsOpen(false)}
        >
          <div
            className={styles.planDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.planDialogHeader}>
              <h4>Plan Details</h4>
              <button
                type="button"
                className={styles.confirmCloseBtn}
                onClick={() => setIsOpen(false)}
              >
                <CloseIcon width={16} height={16} fill="#4d4d4d" />
              </button>
            </div>

            <div className={styles.planDialogBody}>
              <div className={styles.planDialogRow}>
                <span>Plan</span>
                <strong>
                  {planName} - {formatRupees(PLAN_MONTHLY[planId] ?? 0)}/mo
                </strong>
              </div>
              <div className={styles.planDialogRow}>
                <span>Status</span>
                <span className={`${styles.statusPill} ${statusClass}`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <div className={styles.planDialogRow}>
                <span>Started</span>
                <span>
                  {tenant.subscriptionStartedAt
                    ? new Date(
                        tenant.subscriptionStartedAt,
                      ).toLocaleDateString()
                    : '-'}
                </span>
              </div>
              <div className={styles.planDialogRow}>
                <span>Expires</span>
                <span>
                  {tenant.subscriptionExpiresAt
                    ? new Date(
                        tenant.subscriptionExpiresAt,
                      ).toLocaleDateString()
                    : '-'}
                </span>
              </div>
              {typeof tenant.daysUntilExpiry === 'number' &&
                tenant.daysUntilExpiry !== Infinity && (
                  <div className={styles.planDialogRow}>
                    <span>Days left</span>
                    <span>
                      {tenant.daysUntilExpiry > 0
                        ? tenant.daysUntilExpiry
                        : 'Expired'}
                    </span>
                  </div>
                )}

              <div className={styles.featureList}>
                <h5>Features</h5>
                <ul>
                  {tenant.planFeatures?.canOrder && <li>✅ Ordering</li>}
                  {tenant.planFeatures?.canEditFields && <li>✅ Edit Fields</li>}
                  {tenant.planFeatures?.canManageStore && <li>✅ Store Manager</li>}
                  {tenant.planFeatures?.canManageUsers && <li>✅ User Management</li>}
                  {tenant.planFeatures?.canWishlist && <li>✅ Wishlist</li>}
                  {tenant.planFeatures?.canReview && <li>✅ Reviews</li>}
                  {tenant.planFeatures?.canAddCustomMessage && <li>✅ Custom Message</li>}
                </ul>
              </div>
            </div>

            <div className={styles.planDialogFooter}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  setIsOpen(false);
                  onChangePlan();
                }}
              >
                Change Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlanBadge;
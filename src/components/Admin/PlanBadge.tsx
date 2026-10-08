// components/Admin/PlanBadge.tsx
import React, { useState } from 'react';
import { Tenant } from '../../contexts/TenantContext';
import { formatRupees } from '../../utils/subscription';
import { Modal, Button, Badge } from '../ui';
import local from './PlanBadge.module.scss';
import { CheckIcon } from '../../assets/svgs';

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
  basic: 49,
  dynamic: 99,
  professional: 199,
};

type PlanTone = 'info' | 'warning' | 'success';

const toneForPlan = (planId: string): PlanTone => {
  if (planId === 'basic') return 'info';
  if (planId === 'dynamic') return 'warning';
  return 'success';
};

const PlanBadge: React.FC<PlanBadgeProps> = ({ tenant, onChangePlan }) => {
  const [isOpen, setIsOpen] = useState(false);

  const planId = tenant.planId ?? 'professional';
  const planName = tenant.planName ?? PLAN_LABELS[planId] ?? planId;
  const status = tenant.subscriptionStatus ?? 'active';
  const tone = toneForPlan(planId);

  const statusTone =
    status === 'active'
      ? 'success'
      : status === 'paused'
      ? 'warning'
      : 'danger';

  return (
    <>
      <button
        type="button"
        className={local.badgeBtn}
        onClick={() => setIsOpen(true)}
        title={`${planName} . ${status}`}
      >
        <Badge tone={tone} size="sm">
          {planName}
        </Badge>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Plan Details"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                onChangePlan();
              }}
            >
              Change Plan
            </Button>
          </>
        }
      >
        <div className={local.rows}>
          <div className={local.row}>
            <span className={local.rowLabel}>Plan</span>
            <strong>
              {planName} - {formatRupees(PLAN_MONTHLY[planId] ?? 0)}/mo
            </strong>
          </div>

          <div className={local.row}>
            <span className={local.rowLabel}>Status</span>
            <Badge tone={statusTone} size="sm">
              {status.toUpperCase()}
            </Badge>
          </div>

          <div className={local.row}>
            <span className={local.rowLabel}>Started</span>
            <span>
              {tenant.subscriptionStartedAt
                ? new Date(tenant.subscriptionStartedAt).toLocaleDateString()
                : '-'}
            </span>
          </div>

          <div className={local.row}>
            <span className={local.rowLabel}>Expires</span>
            <span>
              {tenant.subscriptionExpiresAt
                ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString()
                : '-'}
            </span>
          </div>

          {typeof tenant.daysUntilExpiry === 'number' &&
            tenant.daysUntilExpiry !== Infinity && (
              <div className={local.row}>
                <span className={local.rowLabel}>Days left</span>
                <span>
                  {tenant.daysUntilExpiry > 0
                    ? tenant.daysUntilExpiry
                    : 'Expired'}
                </span>
              </div>
            )}

          <div className={local.features}>
            <h5>Features</h5>
            <ul>
              {tenant.planFeatures?.canOrder && <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> Ordering</li>}
              {tenant.planFeatures?.canEditFields && <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> Edit Fields</li>}
              {tenant.planFeatures?.canManageStore && (
                <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> Store Manager</li>
              )}
              {tenant.planFeatures?.canManageUsers && (
                <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> User Management</li>
              )}
              {tenant.planFeatures?.canWishlist && <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> Wishlist</li>}
              {tenant.planFeatures?.canReview && <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> Reviews</li>}
              {tenant.planFeatures?.canAddCustomMessage && (
                <li><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /> Custom Message</li>
              )}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PlanBadge;
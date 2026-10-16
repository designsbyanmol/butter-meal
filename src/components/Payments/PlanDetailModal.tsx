// src/components/Payments/PlanDetailModal.tsx
import React from 'react';
import { Modal, Button, Badge } from '../ui';
import { CheckIcon, CloseIcon } from '../../assets/svgs';
import { formatRupees, FIRST_MONTH_PRICE } from '../../utils/subscription';
import { getPlanDefinition } from '../../data/plans';
import local from './PlanDetailModal.module.scss';

interface PlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  monthlyPrice?: number;
  statusBadge?: {
    label: string;
    tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  };
  onPrimaryAction?: { label: string; onClick: () => void };
  /**
   * When true, the price block shows the first-month promotion:
   * "₹1 first month, then ₹XX/mo".
   */
  firstMonthPromo?: boolean;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  isOpen,
  onClose,
  planId,
  planName,
  monthlyPrice,
  statusBadge,
  onPrimaryAction,
  firstMonthPromo = false,
}) => {
  const def = getPlanDefinition(planId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${planName} plan`}
      size="md"
      mobileFullScreen
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onPrimaryAction && (
            <Button onClick={onPrimaryAction.onClick}>
              {onPrimaryAction.label}
            </Button>
          )}
        </>
      }
    >
      <div className={local.body}>
        <div className={local.headRow}>
          <div>
            <div className={local.nameRow}>
              <h3 className={local.planName}>{planName}</h3>
              {statusBadge && (
                <Badge tone={statusBadge.tone} size="sm">
                  {statusBadge.label}
                </Badge>
              )}
              {def.featured && (
                <Badge tone="success" size="sm">
                  Most popular
                </Badge>
              )}
            </div>
            {def.tagline && (
              <p className={local.tagline}>{def.tagline}</p>
            )}
          </div>

          {typeof monthlyPrice === 'number' && (
            <div className={local.priceBlock}>
              {firstMonthPromo ? (
                <>
                  <span className={local.priceStrike}>
                    {formatRupees(monthlyPrice)}
                  </span>
                  <span className={local.priceValue}>
                    {formatRupees(FIRST_MONTH_PRICE)}
                  </span>
                  <span className={local.priceUnit}>first month</span>
                </>
              ) : (
                <>
                  <span className={local.priceValue}>
                    {formatRupees(monthlyPrice)}
                  </span>
                  <span className={local.priceUnit}>/ month</span>
                </>
              )}
            </div>
          )}
        </div>

        {firstMonthPromo && typeof monthlyPrice === 'number' && (
          <p className={local.promoNote}>
            Then {formatRupees(monthlyPrice)}/month from month 2 onward.
            Renew at the regular price.
          </p>
        )}

        {def.description && (
          <p className={local.description}>{def.description}</p>
        )}

        <section className={local.section}>
          <h4 className={local.sectionTitle}>What&apos;s included</h4>
          <ul className={local.list}>
            {def.included.map((line) => (
              <li key={line} className={local.listItem}>
                <span className={local.checkIcon}>
                  <CheckIcon width={12} height={12} fill="#fff" />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {def.excluded && def.excluded.length > 0 && (
          <section className={local.section}>
            <h4 className={local.sectionTitle}>Not included</h4>
            <ul className={local.list}>
              {def.excluded.map((line) => (
                <li
                  key={line}
                  className={`${local.listItem} ${local.listItemMuted}`}
                >
                  <span className={local.crossIcon}>
                    <CloseIcon width={10} height={10} fill="#4d4d4d" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
};

export default PlanDetailModal;
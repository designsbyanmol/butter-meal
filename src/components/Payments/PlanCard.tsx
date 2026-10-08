// src/components/Payments/PlanCard.tsx
import React from 'react';
import { Plan, DurationMonths } from '../../types';
import { computePlanPrice, formatRupees } from '../../utils/subscription';
import { CheckIcon, CloseIcon } from '../../assets/svgs';
import local from './PlanCard.module.scss';

interface PlanCardProps {
  plan: Plan;
  months: DurationMonths;
  selected: boolean;
  /** Render with the green "Popular" ribbon + green header band. */
  featured?: boolean;
  /** Render with the blue header band (used for the "dynamic" tier). */
  blue?: boolean;
  /** Optional small tag rendered top-left (e.g. "Current"). */
  cornerTag?: React.ReactNode;
  onSelect: () => void;
  /** Optional footer CTA label override. Default is Selected / Select Plan. */
  ctaLabel?: (isSelected: boolean) => React.ReactNode;
}

/**
 * Bullet lists per plan id. Kept here so both the signup flow and the
 * admin plan-change modal render identical copy.
 */
export const PLAN_BULLETS: Record<
  string,
  { included: string[]; excluded?: string[] }
> = {
  basic: {
    included: [
      'Menu display only',
      'Editable menu items',
      'Store & product info',
    ],
    excluded: ['No WhatsApp ordering', 'No reviews & ratings', 'No wishlist'],
  },
  dynamic: {
    included: [
      'Everything in Basic',
      'WhatsApp ordering',
      'Add-to-cart & cart flow',
      'Custom message on items',
      'Edit Fields & Store Manager',
    ],
    excluded: ['No reviews & ratings', 'No wishlist'],
  },
  professional: {
    included: [
      'Everything in Dynamic',
      'Reviews & ratings',
      'Wishlist for customers',
      'User Management',
      'Premium setup support',
    ],
  },
};

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  months,
  selected,
  featured,
  blue,
  cornerTag,
  onSelect,
  ctaLabel,
}) => {
  const breakdown = computePlanPrice(plan, months);
  const perMonth = Math.round(breakdown.finalAmount / breakdown.months);
  const bullets = PLAN_BULLETS[plan.id];
  const includedBullets = bullets?.included ?? [];
  const excludedBullets = bullets?.excluded ?? [];

  return (
    <div
      className={[
        local.pcard,
        blue ? local.pcardDynamic : '',
        featured ? local.pcardFeatured : '',
        selected ? local.pcardSelected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {cornerTag}

      {/* ---------- Header band ---------- */}
      <div
        className={`${local.pcardHeader} ${
          featured ? local.pcardHeaderFeatured : ''
        }`}
      >
        <div className={local.pcardTitleRow}>
          <span className={local.pcardName}>{plan.name}</span>
          {featured && (
            <span className={local.pcardPopularTag}>Popular</span>
          )}
        </div>

        <div className={local.pcardPrice}>
          <span className={local.pcardPriceAmount}>
            {formatRupees(perMonth)}
          </span>
          <span className={local.pcardPriceUnit}>/ month</span>
        </div>

        {months > 1 && (
          <div className={local.pcardBilledYearly}>
            Billed {formatRupees(breakdown.finalAmount)}{' '}
            {months === 12 ? '/ year' : `/ ${months} months`}
          </div>
        )}
      </div>

      {/* ---------- Feature list ---------- */}
      <ul className={local.pcardFeatures}>
        {includedBullets.map((line) => (
          <li key={line} className={local.pcardFeature}>
            <span
              className={`${local.pcardFeatureIcon} ${
                featured ? local.pcardFeatureIconFeatured : ''
              }`}
            >
              <CheckIcon
                width={12}
                height={12}
                fill={featured ? '#ffffff' : '#3caa46'}
              />
            </span>
            <span>{line}</span>
          </li>
        ))}
        {excludedBullets.map((line) => (
          <li
            key={line}
            className={`${local.pcardFeature} ${local.pcardFeatureOff}`}
          >
            <span className={local.pcardFeatureIconOff}>
              <CloseIcon width={12} height={12} fill="#4d4d4d" />
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* ---------- Bottom CTA ---------- */}
      <div className={local.pcardCta}>
        <span
          className={`${local.pcardCtaLabel} ${
            featured ? local.pcardCtaLabelFeatured : ''
          }`}
        >
          {ctaLabel
            ? ctaLabel(selected)
            : selected
            ? 'Selected'
            : 'Select Plan'}
        </span>
      </div>
    </div>
  );
};

export default PlanCard;
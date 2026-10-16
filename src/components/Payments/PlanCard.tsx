// src/components/Payments/PlanCard.tsx
import React from "react";
import { Plan, DurationMonths } from "../../types";
import {
  computePlanPrice,
  formatRupees,
  FIRST_MONTH_PRICE,
} from "../../utils/subscription";
import { CheckIcon, CloseIcon } from "../../assets/svgs";
import { getPlanDefinition } from "../../data/plans";
import local from "./PlanCard.module.scss";

interface PlanCardProps {
  plan: Plan;
  months: DurationMonths;
  selected: boolean;
  featured?: boolean;
  blue?: boolean;
  cornerTag?: React.ReactNode;
  onSelect: () => void;
  ctaLabel?: (isSelected: boolean) => React.ReactNode;
  /**
   * When true, the card renders the promotional first-month layout:
   * "₹1 for the first month, then ₹XX/month".
   * Used by the signup flow, where every plan is a first purchase.
   */
  firstMonthMode?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  months,
  selected,
  featured,
  blue,
  cornerTag,
  onSelect,
  ctaLabel,
  firstMonthMode = false,
}) => {
  const def = getPlanDefinition(plan.id);

  const breakdown = computePlanPrice(plan, months, 0, firstMonthMode);
  const regularPerMonth = plan.monthlyPrice;
  const billedTotal = breakdown.finalAmount;
  const isFeatured = featured ?? def.featured;

  return (
    <div
      className={[
        local.pcard,
        blue ? local.pcardDynamic : "",
        isFeatured ? local.pcardFeatured : "",
        selected ? local.pcardSelected : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {cornerTag}

      <div
  className={`${local.pcardHeader} ${
    isFeatured ? local.pcardHeaderFeatured : ''
  }`}
>
  <div className={local.pcardTitleRow}>
    <span className={local.pcardName}>{plan.name}</span>
    {isFeatured && (
      <span className={local.pcardPopularTag}>Popular</span>
    )}
  </div>

  {firstMonthMode ? (
    <>
      <div className={local.pcardPrice}>
        <span className={local.pcardPriceAmount}>
          {formatRupees(FIRST_MONTH_PRICE)}
        </span>
        <span className={local.pcardPriceUnit}>first month</span>
      </div>
      <div className={local.pcardBilledYearly}>
        <span className={local.pcardPromoStrike}>
          {formatRupees(regularPerMonth)}
        </span>{' '} from month 2
      </div>
    </>
  ) : (
    <div className={local.pcardPrice}>
      <span className={local.pcardPriceAmount}>
        {formatRupees(regularPerMonth)}
      </span>
      <span className={local.pcardPriceUnit}>/ month</span>
    </div>
  )}

  {months > 1 && (
    <div className={local.pcardBilledYearly}>
      Billed {formatRupees(billedTotal)}{' '}
      {months === 12 ? '/ year' : `/ ${months} months`}
      {firstMonthMode && ' (including the ₹1 first month)'}
    </div>
  )}
</div>

      <ul className={local.pcardFeatures}>
        {def.included.map((line) => (
          <li key={line} className={local.pcardFeature}>
            <span
              className={`${local.pcardFeatureIcon} ${
                isFeatured ? local.pcardFeatureIconFeatured : ""
              }`}
            >
              <CheckIcon
                width={12}
                height={12}
                fill={isFeatured ? "#ffffff" : "#3caa46"}
              />
            </span>
            <span>{line}</span>
          </li>
        ))}
        {def.excluded?.map((line) => (
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

      <div className={local.pcardCta}>
        <span
          className={`${local.pcardCtaLabel} ${
            isFeatured ? local.pcardCtaLabelFeatured : ""
          }`}
        >
          {ctaLabel
            ? ctaLabel(selected)
            : selected
              ? "Selected"
              : "Select Plan"}
        </span>
      </div>
    </div>
  );
};

export default PlanCard;

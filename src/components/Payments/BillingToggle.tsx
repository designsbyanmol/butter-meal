// src/components/Payments/BillingToggle.tsx
import React from 'react';
import { DURATION_OPTIONS } from '../../types';
import local from './BillingToggle.module.scss';

interface BillingToggleProps {
  /** true = yearly, false = monthly. */
  yearly: boolean;
  onChange: (yearly: boolean) => void;
  /** Called when the user toggles, so parents can reset invoice state. */
  onToggle?: () => void;
}

const YEARLY_DISCOUNT =
  DURATION_OPTIONS.find((d) => d.months === 12)?.discountPct ?? 20;

const BillingToggle: React.FC<BillingToggleProps> = ({
  yearly,
  onChange,
  onToggle,
}) => {
  const handle = (next: boolean) => {
    if (next === yearly) return;
    onChange(next);
    onToggle?.();
  };

  return (
    <div className={local.billingToggleRow}>
      <span
        className={`${local.billingLabel} ${
          !yearly ? local.billingLabelActive : ''
        }`}
      >
        Bill Monthly
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={yearly}
        aria-label="Toggle yearly billing"
        className={`${local.billingSwitch} ${
          yearly ? local.billingSwitchOn : ''
        }`}
        onClick={() => handle(!yearly)}
      >
        <span className={local.billingSwitchKnob} />
      </button>

      <span
        className={`${local.billingLabel} ${
          yearly ? local.billingLabelActive : ''
        }`}
      >
        Bill Yearly
      </span>
    </div>
  );
};

export default BillingToggle;
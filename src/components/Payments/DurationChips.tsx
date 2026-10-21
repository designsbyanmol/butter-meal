// src/components/Payments/DurationChips.tsx
import React from 'react';
import {
  DurationMonths,
  DURATION_OPTIONS,
} from '../../types';
import { Chip } from '../ui';
import local from './DurationChips.module.scss';

interface DurationChipsProps {
  value: DurationMonths;
  onChange: (months: DurationMonths) => void;
  /** Optional: hide 1-month chip when in yearly mode? Not needed here. */
  disabled?: boolean;
  className?: string;
}

/**
 * Renders one chip per DURATION_OPTIONS entry.
 * Active chip shows its discount in a light pill; inactive ones show
 * the discount in a green tinted pill.
 */
const DurationChips: React.FC<DurationChipsProps> = ({
  value,
  onChange,
  disabled,
  className,
}) => {
  return (
    <div
      className={[local.durationGrid, className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {DURATION_OPTIONS.map((opt) => {
        const active = opt.months === value;
        return (
          <Chip
            key={opt.months}
            tone="primary"
            active={active}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.months)}
            className={local.durationChip}
          >
            <span className={local.durationMonths}>{opt.label}</span>
            {opt.discountPct > 0 && (
              <span
                className={`${local.durationDiscount} ${
                  active ? local.durationDiscountActive : ''
                }`}
              >
                {opt.discountPct}% off
              </span>
            )}
          </Chip>
        );
      })}
    </div>
  );
};

export default DurationChips;
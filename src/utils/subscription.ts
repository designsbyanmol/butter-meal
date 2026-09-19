// utils/subscription.ts
import {
  DURATION_OPTIONS,
  DurationMonths,
  Plan,
  DurationOption,
} from '../types';

export const getDurationOption = (months: DurationMonths): DurationOption => {
  return (
    DURATION_OPTIONS.find((d) => d.months === months) ?? DURATION_OPTIONS[0]
  );
};

export interface PriceBreakdown {
  months: number;
  baseAmount: number;
  discountPct: number;
  discountAmount: number;
  finalAmount: number;
}

export const computePrice = (
  monthlyPrice: number,
  months: DurationMonths,
): PriceBreakdown => {
  const opt = getDurationOption(months);
  const baseAmount = Number((monthlyPrice * months).toFixed(2));
  const discountPct = opt.discountPct;
  const discountAmount = Number(
    ((baseAmount * discountPct) / 100).toFixed(2),
  );
  const finalAmount = Number(
    (baseAmount - discountAmount).toFixed(2),
  );
  return {
    months,
    baseAmount,
    discountPct,
    discountAmount,
    finalAmount,
  };
};

export const computePlanPrice = (
  plan: Plan,
  months: DurationMonths,
): PriceBreakdown => computePrice(plan.monthlyPrice, months);

export const formatRupees = (n: number): string =>
  `Rs${n.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const daysBetween = (a: Date, b: Date): number => {
  const MS = 24 * 60 * 60 * 1000;
  return Math.ceil((b.getTime() - a.getTime()) / MS);
};

export const daysUntilExpiry = (
  expiresAtIso: string | undefined,
): number => {
  if (!expiresAtIso) return Infinity;
  return daysBetween(new Date(), new Date(expiresAtIso));
};
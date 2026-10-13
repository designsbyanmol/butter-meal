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
  /** Raw amount: monthlyPrice × months. */
  baseAmount: number;
  /** Duration discount percentage (from DURATION_OPTIONS). */
  discountPct: number;
  /** Discount amount in rupees. */
  discountAmount: number;
  /** Amount after discount, before tax. */
  subtotal: number;
  /** Tax percentage (0-100). Comes from the platform admin's setting. */
  taxPercent: number;
  /** Tax amount in rupees, computed on `subtotal`. */
  taxAmount: number;
  /** Final amount the customer pays: subtotal + tax. */
  finalAmount: number;
}

/**
 * Compute a plan price for a given duration and optional tax rate.
 *
 * Order of operations:
 *   1. baseAmount  = monthlyPrice × months
 *   2. discount    = baseAmount × (discountPct / 100)
 *   3. subtotal    = baseAmount − discount
 *   4. taxAmount   = subtotal × (taxPercent / 100)
 *   5. finalAmount = subtotal + taxAmount
 *
 * Every amount is rounded to 2 decimals at each step so that
 * `subtotal + taxAmount === finalAmount` exactly.
 */
export const computePrice = (
  monthlyPrice: number,
  months: DurationMonths,
  taxPercent = 0,
): PriceBreakdown => {
  const opt = getDurationOption(months);

  const baseAmount = Number((monthlyPrice * months).toFixed(2));
  const discountPct = opt.discountPct;
  const discountAmount = Number(
    ((baseAmount * discountPct) / 100).toFixed(2),
  );

  const subtotal = Number((baseAmount - discountAmount).toFixed(2));

  // Clamp to a safe 0-100 range regardless of what the caller passes.
  const safeTaxPercent = Math.max(0, Math.min(Number(taxPercent) || 0, 100));
  const taxAmount = Number(
    ((subtotal * safeTaxPercent) / 100).toFixed(2),
  );

  const finalAmount = Number((subtotal + taxAmount).toFixed(2));

  return {
    months,
    baseAmount,
    discountPct,
    discountAmount,
    subtotal,
    taxPercent: safeTaxPercent,
    taxAmount,
    finalAmount,
  };
};

export const computePlanPrice = (
  plan: Plan,
  months: DurationMonths,
  taxPercent = 0,
): PriceBreakdown => computePrice(plan.monthlyPrice, months, taxPercent);

export const formatRupees = (n: number): string =>
  `Rs ${n.toLocaleString('en-IN', {
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
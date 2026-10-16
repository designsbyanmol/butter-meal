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

/** The promotional first-month price in rupees. */
export const FIRST_MONTH_PRICE = 1;

export interface PriceBreakdown {
  months: number;
  baseAmount: number;
  discountPct: number;
  discountAmount: number;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  finalAmount: number;
  /**
   * True when the price shown is the promotional first-month price
   * rather than the plan's regular monthly price.
   */
  isFirstMonth: boolean;
  /**
   * The regular monthly price this plan will charge from month 2
   * onward, or on renewal. Handy for "then ₹XX/mo" copy in the UI.
   */
  regularMonthlyPrice: number;
}

/**
 * Compute a plan price for a given duration and optional tax rate.
 *
 * When `isFirstMonth` is true:
 *   - The first month's base is `FIRST_MONTH_PRICE` (₹1).
 *   - Any additional months in the bundle are charged at the plan's
 *     regular monthly price, with the normal duration discount.
 *   - Tax applies to the total.
 *
 * When `isFirstMonth` is false (renewals, upgrades, downgrades):
 *   - Behaves exactly as before — plan price × months, minus the
 *     duration discount, plus tax.
 *
 * Every amount is rounded to 2 decimals so
 * `subtotal + taxAmount === finalAmount` exactly.
 */
export const computePrice = (
  monthlyPrice: number,
  months: DurationMonths,
  taxPercent = 0,
  isFirstMonth = false,
): PriceBreakdown => {
  const opt = getDurationOption(months);

  let baseAmount: number;
  let discountPct: number;

  if (isFirstMonth) {
    // Month 1 is ₹1 flat, no duration discount on it.
    // Additional months (if any) are charged at the regular price
    // with the standard duration discount applied to those months.
    const extraMonths = Math.max(0, months - 1);
    const extraBase = extraMonths * monthlyPrice;
    const extraDiscount = Number(
      ((extraBase * opt.discountPct) / 100).toFixed(2),
    );
    baseAmount = Number(
      (FIRST_MONTH_PRICE + extraBase).toFixed(2),
    );
    discountPct = opt.discountPct;

    const discountAmount = extraDiscount;
    const subtotal = Number((baseAmount - discountAmount).toFixed(2));
    const safeTaxPercent = clampTax(taxPercent);
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
      isFirstMonth: true,
      regularMonthlyPrice: monthlyPrice,
    };
  }

  // Regular pricing
  baseAmount = Number((monthlyPrice * months).toFixed(2));
  discountPct = opt.discountPct;
  const discountAmount = Number(
    ((baseAmount * discountPct) / 100).toFixed(2),
  );
  const subtotal = Number((baseAmount - discountAmount).toFixed(2));

  const safeTaxPercent = clampTax(taxPercent);
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
    isFirstMonth: false,
    regularMonthlyPrice: monthlyPrice,
  };
};

const clampTax = (t: number): number =>
  Math.max(0, Math.min(Number(t) || 0, 100));

export const computePlanPrice = (
  plan: Plan,
  months: DurationMonths,
  taxPercent = 0,
  isFirstMonth = false,
): PriceBreakdown =>
  computePrice(plan.monthlyPrice, months, taxPercent, isFirstMonth);

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
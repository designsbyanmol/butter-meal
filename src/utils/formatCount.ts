// utils/formatCount.ts

/**
 * Format a review/quantity count in Indian short form:
 *
 *   999          → "999"
 *   1,000        → "1.0K"
 *   12,499       → "12.4K"
 *   12,514       → "12.5K"
 *   99,999       → "99.9K"
 *   1,22,330     → "1.2L"      (1.22 lakhs)
 *   99,99,999    → "99.9L"
 *   12,30,00,220  → "12.3Cr"
 *
 * Values are truncated, not rounded, so 12,499 → "12.4K" (not 12.5K).
 */
export const formatCount = (value: number | string | undefined | null): string => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return '0';

  if (n < 1000) return String(Math.floor(n));

  const truncate = (num: number, divisor: number) => {
    const scaled = num / divisor;
    const truncated = Math.floor(scaled * 10) / 10;
    return truncated.toFixed(1);
  };

  if (n < 100000) {
    // 1,000 – 99,999 → K
    return `${truncate(n, 1000)}K`;
  }

  if (n < 10000000) {
    // 1,00,000 – 99,99,999 → L (lakh)
    return `${truncate(n, 100000)}L`;
  }

  // ≥ 1,00,00,000 → Cr (crore)
  return `${truncate(n, 10000000)}Cr`;
};
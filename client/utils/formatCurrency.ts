/**
 * Formats a number as Philippine Peso currency
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

/**
 * Formats a large currency amount compactly for space-constrained UI.
 * Examples: ₱1.2M, ₱15.5K, ₱2.5B
 * Falls back to integer peso format for amounts under ₱100,000.
 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}₱${+(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${sign}₱${+(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000)       return `${sign}₱${+(abs / 1_000).toFixed(1)}K`;
  return formatCurrency(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

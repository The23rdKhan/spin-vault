/**
 * formatCoins — Convert bigint coin amounts to human-readable strings
 *
 * Examples:
 *   1_234_567n → "1.2M"
 *   5_000n     → "5K"
 *   999n       → "999"
 *   0n         → "0"
 */
export function formatCoins(amount: bigint): string {
  if (amount < 0n) return '0';

  if (amount >= 1_000_000n) {
    // Show one decimal place for millions
    const millions = Number(amount) / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted}M`;
  }

  if (amount >= 1_000n) {
    const thousands = Number(amount) / 1_000;
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K`;
  }

  return String(amount);
}

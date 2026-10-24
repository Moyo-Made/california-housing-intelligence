const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Formats dollars rounded to the nearest `step` (e.g. 1000 for the headline,
 * 100 for differences), so the display doesn't imply false precision.
 */
export function formatUsd(value: number, step = 1): string {
  const rounded = Math.round(value / step) * step;
  // Avoid "-$0" when a small negative difference rounds to zero.
  return usd.format(rounded === 0 ? 0 : rounded);
}

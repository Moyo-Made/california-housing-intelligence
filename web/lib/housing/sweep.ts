import { FEATURES, type FeatureName } from "./features";

/** Evenly spaced points per sweep; the current value is added on top. */
export const SWEEP_STEPS = 31;

/**
 * Values to try for one feature, in model units: evenly spaced across the
 * range 98% of areas fall in (1st–99th percentile), widened to include the
 * current value, plus the current value itself so the curve passes through
 * the current estimate. Sorted, without duplicates, inside the hard limits.
 */
export function sweepValues(feature: FeatureName, current: number): number[] {
  const { stats, limits } = FEATURES[feature];
  const low = Math.min(stats.p1, current);
  const high = Math.max(stats.p99, current);

  const values = Array.from({ length: SWEEP_STEPS }, (_, i) =>
    clean(low + ((high - low) * i) / (SWEEP_STEPS - 1)),
  );
  values.push(current);

  return [...new Set(values)]
    .filter((value) => {
      const { min, max } = limits;
      if (min && (min.inclusive ? value < min.value : value <= min.value)) return false;
      if (max && (max.inclusive ? value > max.value : value >= max.value)) return false;
      return true;
    })
    .sort((a, b) => a - b);
}

function clean(value: number): number {
  return Number(value.toPrecision(10));
}

import { FEATURE_NAMES, type FeatureName } from "@/lib/housing/features";
import type { Provenance } from "@/lib/housing/presets";
import type { HousingInput } from "@/lib/housing/types";

/** Estimates are shown to the nearest $1,000; differences use the same rounding. */
export const DISPLAY_STEP_USD = 1_000;

export type Baseline = {
  input: HousingInput;
  valueUsd: number;
  provenance: Provenance;
};

export type InputChange = {
  name: FeatureName;
  from: number;
  /** Undefined while the current value is invalid. */
  to: number | undefined;
};

export function roundForDisplay(usd: number): number {
  return Math.round(usd / DISPLAY_STEP_USD) * DISPLAY_STEP_USD;
}

/**
 * Difference between two estimates as displayed. Computed from the rounded
 * figures so it always matches what a reader would get by subtracting them.
 */
export function displayedDifference(currentUsd: number, baselineUsd: number): number {
  return roundForDisplay(currentUsd) - roundForDisplay(baselineUsd);
}

/** Features whose current value differs from the baseline, in model order. */
export function changedInputs(
  baseline: HousingInput,
  current: Partial<HousingInput>,
): InputChange[] {
  return FEATURE_NAMES.filter((name) => current[name] !== baseline[name]).map((name) => ({
    name,
    from: baseline[name],
    to: current[name],
  }));
}

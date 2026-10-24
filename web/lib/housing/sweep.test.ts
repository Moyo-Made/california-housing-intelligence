import { describe, expect, test } from "vitest";
import { FEATURE_NAMES, FEATURES } from "./features";
import { SWEEP_STEPS, sweepValues } from "./sweep";
import { validateInput } from "./validation";
import { EXAMPLE_INPUT } from "@/test/fixtures";

describe("sweepValues", () => {
  test("spans the typical range and includes the current value", () => {
    const values = sweepValues("MedInc", 8.3252);
    const { p1, p99 } = FEATURES.MedInc.stats;

    expect(values[0]).toBe(p1);
    expect(values[values.length - 1]).toBe(p99);
    expect(values).toContain(8.3252);
    expect(values).toHaveLength(SWEEP_STEPS + 1);
  });

  test("is sorted and has no duplicates", () => {
    const values = sweepValues("HouseAge", 52); // 52 is also the 99th percentile
    expect(values).toEqual([...new Set(values)].sort((a, b) => a - b));
    expect(values).toHaveLength(SWEEP_STEPS);
  });

  test("widens to include a current value outside the typical range", () => {
    const values = sweepValues("Population", 50_000);
    expect(values[0]).toBe(FEATURES.Population.stats.p1);
    expect(values[values.length - 1]).toBe(50_000);
  });

  test.each(FEATURE_NAMES)("every %s value produces a valid input", (feature) => {
    for (const value of sweepValues(feature, EXAMPLE_INPUT[feature])) {
      expect(validateInput({ ...EXAMPLE_INPUT, [feature]: value }).ok).toBe(true);
    }
  });
});

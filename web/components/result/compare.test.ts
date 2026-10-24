import { describe, expect, test } from "vitest";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { changedInputs, displayedDifference } from "./compare";
import { differenceSentence } from "./comparison-panel";

describe("displayedDifference", () => {
  test("matches the difference of the figures on screen", () => {
    // $312,400 shows as $312,000 and $430,600 as $431,000: the reader sees $119,000.
    expect(displayedDifference(430_600, 312_400)).toBe(119_000);
  });

  test("is zero when both round to the same figure", () => {
    expect(displayedDifference(430_400, 429_600)).toBe(0);
  });
});

describe("differenceSentence", () => {
  test.each([
    [46_000, "▲ The model’s estimate is $46,000 higher than for the baseline."],
    [-29_000, "▼ The model’s estimate is $29,000 lower than for the baseline."],
    [0, "The model’s estimate is the same as for the baseline, to the nearest $1,000."],
  ])("%d → %s", (difference, sentence) => {
    expect(differenceSentence(difference)).toBe(sentence);
  });
});

describe("changedInputs", () => {
  test("lists only the features that differ, in model order", () => {
    expect(changedInputs(EXAMPLE_INPUT, { ...EXAMPLE_INPUT, Longitude: -122, MedInc: 5 })).toEqual([
      { name: "MedInc", from: 8.3252, to: 5 },
      { name: "Longitude", from: -122.23, to: -122 },
    ]);
  });

  test("treats a missing (invalid) current value as changed", () => {
    const current: Partial<typeof EXAMPLE_INPUT> = { ...EXAMPLE_INPUT };
    delete current.Population;
    expect(changedInputs(EXAMPLE_INPUT, current)).toEqual([
      { name: "Population", from: 322, to: undefined },
    ]);
  });

  test("is empty for identical inputs", () => {
    expect(changedInputs(EXAMPLE_INPUT, { ...EXAMPLE_INPUT })).toEqual([]);
  });
});

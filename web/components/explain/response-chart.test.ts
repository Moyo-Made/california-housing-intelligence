import { expect, test } from "vitest";
import { niceTicks } from "./response-chart";

test.each([
  ["income in dollars", 10_696, 105_965, [20_000, 40_000, 60_000, 80_000, 100_000]],
  ["population", 88, 5_805.83, [1_000, 2_000, 3_000, 4_000, 5_000]],
  ["house age", 4, 52, [10, 20, 30, 40, 50]],
  ["longitude", -123.22, -116.29, [-122, -120, -118]],
  ["bedrooms", 0.8728, 2.1275, [1, 1.25, 1.5, 1.75, 2]],
])("round ticks for %s", (_, low, high, ticks) => {
  expect(niceTicks(low, high)).toEqual(ticks);
});

test("a zero-width range gets a single tick", () => {
  expect(niceTicks(3, 3)).toEqual([3]);
});

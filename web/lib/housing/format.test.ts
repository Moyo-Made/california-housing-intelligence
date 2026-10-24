import { expect, test } from "vitest";
import { formatUsd } from "./format";

test.each([
  [430217.29, 1, "$430,217"],
  [430217.29, 1000, "$430,000"],
  [430500, 1000, "$431,000"],
  [-41_260, 100, "-$41,300"],
  [-40, 100, "$0"],
  [0, 1000, "$0"],
])("formatUsd(%d, %d) = %s", (value, step, expected) => {
  expect(formatUsd(value, step)).toBe(expected);
});

import { expect, test } from "vitest";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { DEFAULT_PRESET_ID, getPreset, PRESETS } from "./presets";
import { validateInput } from "./validation";

test.each(PRESETS.map((preset) => [preset.id, preset] as const))(
  "preset %s passes validation",
  (_, preset) => {
    expect(validateInput(preset.values).ok).toBe(true);
  },
);

test("ids are unique and the default exists", () => {
  expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
  expect(getPreset(DEFAULT_PRESET_ID).provenance.kind).toBe("synthetic");
});

test("row 0 is the API's documented example (which rounds to 6 decimals)", () => {
  const { values } = getPreset("row-0");
  for (const [name, value] of Object.entries(EXAMPLE_INPUT)) {
    expect(values[name as keyof typeof values]).toBeCloseTo(value, 5);
  }
});

test("only the median profile is synthetic", () => {
  expect(PRESETS.filter((preset) => preset.provenance.kind === "synthetic").map((p) => p.id)).toEqual([
    "median",
  ]);
});

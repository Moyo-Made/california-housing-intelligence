import { describe, expect, test } from "vitest";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { FEATURE_NAMES } from "./features";
import { assessInput, validateInput } from "./validation";

describe("validateInput", () => {
  test("accepts the documented example", () => {
    expect(validateInput(EXAMPLE_INPUT)).toEqual({ ok: true, input: EXAMPLE_INPUT });
  });

  test("forwards only the eight features", () => {
    const result = validateInput({ ...EXAMPLE_INPUT, extra: "dropped" });
    expect(result.ok && Object.keys(result.input)).toEqual([...FEATURE_NAMES]);
  });

  test.each([null, undefined, "text", 42, []])("rejects a non-object body (%j)", (raw) => {
    const result = validateInput(raw);
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors)).toEqual([...FEATURE_NAMES]);
  });

  test("reports every missing field", () => {
    const partial: Record<string, number> = { ...EXAMPLE_INPUT };
    delete partial.MedInc;
    delete partial.Latitude;
    expect(validateInput(partial)).toEqual({
      ok: false,
      errors: {
        MedInc: "Median household income is required.",
        Latitude: "Latitude is required.",
      },
    });
  });

  test.each(["8.3", Number.NaN, Number.POSITIVE_INFINITY, true])(
    "rejects a non-finite or non-number value (%j)",
    (value) => {
      expect(validateInput({ ...EXAMPLE_INPUT, MedInc: value })).toEqual({
        ok: false,
        errors: { MedInc: "Median household income must be a number." },
      });
    },
  );

  // Mirrors the API's Pydantic constraints: gt=0 vs ge=0.
  test.each([
    ["MedInc", 0, false],
    ["HouseAge", 0, true],
    ["AveRooms", 0, false],
    ["AveBedrms", 0, true],
    ["Population", 0, true],
    ["AveOccup", 0, false],
  ] as const)("%s = %d is accepted: %s", (name, value, accepted) => {
    expect(validateInput({ ...EXAMPLE_INPUT, [name]: value }).ok).toBe(accepted);
  });

  test("explains exclusive and inclusive minimums", () => {
    const result = validateInput({ ...EXAMPLE_INPUT, MedInc: -1, HouseAge: -1 });
    expect(!result.ok && result.errors).toEqual({
      MedInc: "Median household income must be greater than 0.",
      HouseAge: "Median house age must be at least 0.",
    });
  });

  test.each([
    ["Latitude", 32.5, true],
    ["Latitude", 42, true],
    ["Latitude", 32.49, false],
    ["Latitude", 42.01, false],
    ["Longitude", -124.5, true],
    ["Longitude", -114.1, true],
    ["Longitude", -124.51, false],
    ["Longitude", -114.09, false],
  ] as const)("limits %s to California: %d accepted %s", (name, value, accepted) => {
    expect(validateInput({ ...EXAMPLE_INPUT, [name]: value }).ok).toBe(accepted);
  });

  test("describes the California range", () => {
    const result = validateInput({ ...EXAMPLE_INPUT, Latitude: 51.5 });
    expect(!result.ok && result.errors.Latitude).toBe(
      "Latitude must be between 32.5 and 42.",
    );
  });
});

describe("assessInput", () => {
  test("has no notices for the documented example", () => {
    expect(assessInput(EXAMPLE_INPUT)).toEqual([]);
  });

  test("flags values outside the 1st–99th percentile as atypical", () => {
    expect(assessInput({ ...EXAMPLE_INPUT, Population: 10_000 })).toEqual([
      { kind: "atypical", feature: "Population" },
    ]);
  });

  test("flags values outside anything seen in training", () => {
    expect(assessInput({ ...EXAMPLE_INPUT, Population: 50_000, HouseAge: 60 })).toEqual([
      { kind: "beyond-training", feature: "HouseAge" },
      { kind: "beyond-training", feature: "Population" },
    ]);
  });

  test("flags more bedrooms than rooms", () => {
    expect(assessInput({ ...EXAMPLE_INPUT, AveRooms: 1.5, AveBedrms: 2 })).toContainEqual({
      kind: "bedrooms-exceed-rooms",
    });
  });
});

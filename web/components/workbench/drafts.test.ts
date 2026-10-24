import { describe, expect, test } from "vitest";
import {
  describeRange,
  draftToModel,
  parseDisplay,
  toDraft,
  typicalRange,
} from "./drafts";

describe("toDraft", () => {
  test.each([
    ["MedInc", 8.3252, "83,252"],
    ["MedInc", 15.0001, "150,001"],
    ["Population", 1166, "1,166"],
    ["AveRooms", 6.984126984126984, "6.98"],
    ["HouseAge", 52, "52"],
    ["Longitude", -122.23, "-122.23"],
  ] as const)("%s %d is shown as %s", (name, value, draft) => {
    expect(toDraft(name, value)).toBe(draft);
  });
});

describe("parseDisplay", () => {
  test.each([
    ["83,252", 83252],
    ["$83,252", 83252],
    [" 2.5 ", 2.5],
    [".5", 0.5],
    ["3.", 3],
    ["−122.23", -122.23],
    ["-122.23", -122.23],
  ])("parses %j as %d", (draft, expected) => {
    expect(parseDisplay(draft)).toBe(expected);
  });

  test("returns undefined when empty", () => {
    expect(parseDisplay("  ")).toBeUndefined();
  });

  test.each(["abc", "1e3", "1.2.3", "-", "12 people", "0x10"])("rejects %j", (draft) => {
    expect(parseDisplay(draft)).toBeNaN();
  });
});

describe("draftToModel", () => {
  test("converts income from dollars to tens of thousands without float noise", () => {
    expect(draftToModel("MedInc", "83,252")).toBe(8.3252);
  });

  test("passes other features through unchanged", () => {
    expect(draftToModel("Latitude", "37.88")).toBe(37.88);
  });

  test("passes empty and invalid drafts through for validation", () => {
    expect(draftToModel("MedInc", "")).toBeUndefined();
    expect(draftToModel("MedInc", "lots")).toBeNaN();
  });
});

describe("ranges", () => {
  test("describes income in dollars with its unit", () => {
    expect(typicalRange("MedInc")).toBe("$10,696–$105,965 a year");
  });

  test("uses 'to' and typographic minus for negative ranges", () => {
    expect(typicalRange("Longitude")).toBe("−123.22 to −116.29°");
  });

  test("attaches degree units without a space", () => {
    expect(describeRange("Latitude", 32.54, 41.95)).toBe("32.54–41.95°N");
  });
});

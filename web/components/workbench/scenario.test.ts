import { describe, expect, test } from "vitest";
import { getPreset } from "@/lib/housing/presets";
import {
  deriveScenario,
  initialScenario,
  scenarioReducer,
  type ScenarioState,
} from "./scenario";

function edit(state: ScenarioState, name: keyof ScenarioState["drafts"], draft: string) {
  return scenarioReducer(state, { type: "edit", name, draft });
}

describe("scenario", () => {
  test("starts from the synthetic median profile", () => {
    const scenario = deriveScenario(initialScenario());

    expect(scenario.provenance).toEqual({ kind: "synthetic" });
    expect(scenario.input).toEqual(getPreset("median").values);
    expect(scenario.isPristine).toBe(true);
  });

  test("sends a real record's exact values, not the rounded ones on screen", () => {
    const state = initialScenario("row-0");
    const scenario = deriveScenario(state);

    expect(state.drafts.AveRooms).toBe("6.98");
    expect(scenario.input?.AveRooms).toBe(6.984126984126984);
    expect(scenario.provenance).toEqual({ kind: "record", row: 0, place: "Berkeley hills" });
  });

  test("any edit makes the inputs constructed", () => {
    const scenario = deriveScenario(edit(initialScenario("row-0"), "HouseAge", "40"));
    expect(scenario.provenance).toEqual({ kind: "constructed" });
  });

  test("editing one field keeps the exact values of the others", () => {
    const scenario = deriveScenario(edit(initialScenario("row-0"), "HouseAge", "40"));
    expect(scenario.input).toEqual({ ...getPreset("row-0").values, HouseAge: 40 });
  });

  test("a field retyped with more precision sends what was typed", () => {
    const scenario = deriveScenario(edit(initialScenario("row-0"), "AveRooms", "6.984"));
    expect(scenario.input?.AveRooms).toBe(6.984);
  });

  test("undoing an edit restores the record and its exact values", () => {
    const edited = edit(initialScenario("row-0"), "HouseAge", "40");
    const scenario = deriveScenario(edit(edited, "HouseAge", "41"));

    expect(scenario.provenance.kind).toBe("record");
    expect(scenario.input?.AveRooms).toBe(6.984126984126984);
  });

  test("an invalid field blocks the input but keeps the valid values and their notices", () => {
    let state = edit(initialScenario(), "Latitude", "north");
    state = edit(state, "Population", "50,000");
    const scenario = deriveScenario(state);

    expect(scenario.input).toBeNull();
    expect(scenario.errors).toEqual({ Latitude: "Latitude must be a number." });
    expect(scenario.values.Population).toBe(50_000);
    expect(scenario.values).not.toHaveProperty("Latitude");
    expect(scenario.notices).toEqual([{ kind: "beyond-training", feature: "Population" }]);
  });

  test("loading a preset replaces every draft", () => {
    const state = scenarioReducer(edit(initialScenario(), "MedInc", ""), {
      type: "load",
      presetId: "row-4551",
    });
    expect(deriveScenario(state)).toMatchObject({
      errors: {},
      provenance: { kind: "record", row: 4551 },
    });
  });
});

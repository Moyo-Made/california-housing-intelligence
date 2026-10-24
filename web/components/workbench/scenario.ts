import { FEATURE_NAMES } from "@/lib/housing/features";
import {
  DEFAULT_PRESET_ID,
  getPreset,
  type Preset,
  type Provenance,
} from "@/lib/housing/presets";
import type { FieldErrors, HousingInput } from "@/lib/housing/types";
import { assessInput, validateInput, type Notice } from "@/lib/housing/validation";
import { draftToModel, toDraft, type Drafts } from "./drafts";

export type ScenarioState = {
  drafts: Drafts;
  /** The preset the drafts were last loaded from. */
  presetId: string;
};

export type ScenarioAction =
  | { type: "edit"; name: keyof Drafts; draft: string }
  | { type: "load"; presetId: string };

export function presetDrafts(preset: Preset): Drafts {
  return Object.fromEntries(
    FEATURE_NAMES.map((name) => [name, toDraft(name, preset.values[name])]),
  ) as Drafts;
}

export function initialScenario(presetId = DEFAULT_PRESET_ID): ScenarioState {
  return { drafts: presetDrafts(getPreset(presetId)), presetId };
}

export function scenarioReducer(
  state: ScenarioState,
  action: ScenarioAction,
): ScenarioState {
  switch (action.type) {
    case "edit":
      return { ...state, drafts: { ...state.drafts, [action.name]: action.draft } };
    case "load":
      return initialScenario(action.presetId);
  }
}

export type Scenario = {
  /** What would be sent to the model; null while any field is invalid. */
  input: HousingInput | null;
  /** Values of the fields that are currently valid, in model units. */
  values: Partial<HousingInput>;
  errors: FieldErrors;
  notices: Notice[];
  provenance: Provenance;
  /** True while the drafts still match the loaded preset exactly. */
  isPristine: boolean;
};

export function deriveScenario({ drafts, presetId }: ScenarioState): Scenario {
  const preset = getPreset(presetId);
  const loaded = presetDrafts(preset);
  const isPristine = FEATURE_NAMES.every((name) => drafts[name] === loaded[name]);

  // Inputs show rounded numbers, so a field the user hasn't changed sends the
  // preset's exact value: a real record reaches the model exactly as recorded,
  // and editing one field doesn't quietly round the others.
  const values: Record<string, number | undefined> = Object.fromEntries(
    FEATURE_NAMES.map((name) => [
      name,
      drafts[name] === loaded[name]
        ? preset.values[name]
        : draftToModel(name, drafts[name]),
    ]),
  );
  const validation = validateInput(values);
  const errors = validation.ok ? {} : validation.errors;
  const validValues: Partial<HousingInput> = Object.fromEntries(
    FEATURE_NAMES.filter((name) => !errors[name]).map((name) => [name, values[name]]),
  );

  return {
    input: validation.ok ? validation.input : null,
    values: validValues,
    errors,
    notices: assessInput(validValues),
    provenance: isPristine ? preset.provenance : { kind: "constructed" },
    isPristine,
  };
}

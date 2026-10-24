import { FEATURE_NAMES, FEATURES, type FeatureName } from "./features";
import type { FieldErrors, HousingInput } from "./types";

export type Validation =
  | { ok: true; input: HousingInput }
  | { ok: false; errors: FieldErrors };

/**
 * Checks the hard limits that block a request. Accepts unknown data (a parsed
 * request body or form state) and returns a fresh object holding only the
 * eight features, so nothing else is ever forwarded to the API.
 */
export function validateInput(raw: unknown): Validation {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      errors: Object.fromEntries(
        FEATURE_NAMES.map((name) => [name, `${FEATURES[name].label} is required.`]),
      ),
    };
  }

  const record = raw as Record<string, unknown>;
  const input: Partial<HousingInput> = {};
  const errors: FieldErrors = {};

  for (const name of FEATURE_NAMES) {
    const value = record[name];
    const error = checkValue(name, value);
    if (error) errors[name] = error;
    else input[name] = value as number;
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, input: input as HousingInput };
}

function checkValue(name: FeatureName, value: unknown): string | undefined {
  const { label, limits } = FEATURES[name];

  if (value === undefined || value === null || value === "") {
    return `${label} is required.`;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${label} must be a number.`;
  }

  const { min, max } = limits;
  if (min && (min.inclusive ? value < min.value : value <= min.value)) {
    return max
      ? `${label} must be between ${min.value} and ${max.value}.`
      : `${label} must be ${min.inclusive ? "at least" : "greater than"} ${min.value}.`;
  }
  if (max && (max.inclusive ? value > max.value : value >= max.value)) {
    return min
      ? `${label} must be between ${min.value} and ${max.value}.`
      : `${label} must be ${max.inclusive ? "at most" : "less than"} ${max.value}.`;
  }
  return undefined;
}

/**
 * Soft notices about valid input that the model has little or no data for.
 * They never block a request.
 */
export type Notice =
  | { kind: "atypical"; feature: FeatureName }
  | { kind: "beyond-training"; feature: FeatureName }
  | { kind: "bedrooms-exceed-rooms" };

export function assessInput(input: HousingInput): Notice[] {
  const notices: Notice[] = [];

  for (const name of FEATURE_NAMES) {
    const { stats } = FEATURES[name];
    const value = input[name];
    if (value < stats.min || value > stats.max) {
      notices.push({ kind: "beyond-training", feature: name });
    } else if (value < stats.p1 || value > stats.p99) {
      notices.push({ kind: "atypical", feature: name });
    }
  }

  if (input.AveBedrms > input.AveRooms) {
    notices.push({ kind: "bedrooms-exceed-rooms" });
  }
  return notices;
}

import { FEATURES, type FeatureName } from "@/lib/housing/features";
import { FIELDS } from "./fields";

/** Text currently in each input, in display units (income in dollars). */
export type Drafts = Record<FeatureName, string>;

const NUMBER_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)$/;

/** Removes floating-point noise such as 83251.99999999999. */
function clean(value: number): number {
  return Number(value.toPrecision(12));
}

/** Formats a display-unit number the way the input shows it. */
export function formatDisplay(name: FeatureName, display: number): string {
  const { decimals, grouping } = FIELDS[name];
  return display.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    useGrouping: grouping ?? false,
  });
}

export function toDraft(name: FeatureName, modelValue: number): string {
  return formatDisplay(name, clean(modelValue * FIELDS[name].scale));
}

/**
 * Parses an input's text into display units. Accepts thousands separators, a
 * leading "$" and the typographic minus. Returns undefined when empty and NaN
 * when it isn't a plain decimal number.
 */
export function parseDisplay(draft: string): number | undefined {
  const text = draft.replace(/[\s,$]/g, "").replace(/−/g, "-");
  if (text === "") return undefined;
  return NUMBER_PATTERN.test(text) ? Number(text) : Number.NaN;
}

export function displayToModel(name: FeatureName, display: number): number {
  return clean(display / FIELDS[name].scale);
}

/** Parses a draft into model units, passing empty and invalid drafts through for validation. */
export function draftToModel(name: FeatureName, draft: string): number | undefined {
  const display = parseDisplay(draft);
  return display === undefined || Number.isNaN(display)
    ? display
    : displayToModel(name, display);
}

/** Formats a model-unit value for help text and notices, e.g. "$10,696" or "−123.22°". */
export function describeValue(name: FeatureName, modelValue: number): string {
  const { prefix = "" } = FIELDS[name];
  const text = formatDisplay(name, clean(modelValue * FIELDS[name].scale));
  return text.startsWith("-") ? `−${prefix}${text.slice(1)}` : `${prefix}${text}`;
}

/** Appends the field's unit; degree signs attach without a space. */
function withUnit(name: FeatureName, text: string): string {
  const { suffix } = FIELDS[name];
  return suffix ? `${text} ${suffix}`.replace(/ °/, "°") : text;
}

/** e.g. "$83,252 a year", "41 years" or "−122.23°". */
export function describeValueWithUnit(name: FeatureName, modelValue: number): string {
  return withUnit(name, describeValue(name, modelValue));
}

/** e.g. "$10,696–$105,965 a year" or "−123.22 to −116.29°". */
export function describeRange(name: FeatureName, min: number, max: number): string {
  const low = describeValue(name, min);
  const high = describeValue(name, max);
  return withUnit(name, min < 0 ? `${low} to ${high}` : `${low}–${high}`);
}

export function typicalRange(name: FeatureName): string {
  const { p1, p99 } = FEATURES[name].stats;
  return describeRange(name, p1, p99);
}

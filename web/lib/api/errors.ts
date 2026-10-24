import type {
  FieldErrors,
  PredictError,
  PredictErrorKind,
  PredictResult,
} from "@/lib/housing/types";

const MESSAGES: Record<PredictErrorKind, string> = {
  validation: "Some inputs are missing or invalid.",
  unavailable:
    "The prediction service isn't reachable right now. Please try again in a moment.",
  timeout: "The prediction service took too long to respond. Please try again.",
  bad_response:
    "The prediction service sent an unexpected response. Please try again.",
};

export function failure(
  kind: PredictErrorKind,
  fields?: FieldErrors,
): Extract<PredictResult, { ok: false }> {
  const error: PredictError = { kind, message: MESSAGES[kind] };
  if (fields) error.fields = fields;
  return { ok: false, error };
}

/** Matches the `{ error }` body that /api/predict returns on failure. */
export function isErrorBody(body: unknown): body is { error: PredictError } {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return false;
  }
  const { error } = body as { error: unknown };
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    typeof error.kind === "string" &&
    error.kind in MESSAGES &&
    "message" in error &&
    typeof error.message === "string"
  );
}

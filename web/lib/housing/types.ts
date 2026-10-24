import type { FeatureName } from "./features";

/** Request body of the API's POST /predict. */
export type HousingInput = Record<FeatureName, number>;

/** Response body of the API's POST /predict. */
export type PredictionResponse = {
  /** Predicted median home value of the block group, in 1990 US dollars. */
  predicted_value_usd: number;
};

export type FieldErrors = Partial<Record<FeatureName, string>>;

export type PredictErrorKind =
  | "validation"
  | "unavailable"
  | "timeout"
  | "bad_response";

export type PredictError = {
  kind: PredictErrorKind;
  /** Safe to show to users. */
  message: string;
  fields?: FieldErrors;
};

export type PredictResult =
  | { ok: true; data: PredictionResponse }
  | { ok: false; error: PredictError };

export function isPredictionResponse(body: unknown): body is PredictionResponse {
  return (
    typeof body === "object" &&
    body !== null &&
    "predicted_value_usd" in body &&
    typeof body.predicted_value_usd === "number" &&
    Number.isFinite(body.predicted_value_usd)
  );
}

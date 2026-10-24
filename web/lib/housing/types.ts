import { isFeatureName, type FeatureName } from "./features";

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

export type Failure = { ok: false; error: PredictError };
export type ApiResult<T> = { ok: true; data: T } | Failure;
export type PredictResult = ApiResult<PredictionResponse>;

export function isPredictionResponse(body: unknown): body is PredictionResponse {
  return (
    typeof body === "object" &&
    body !== null &&
    "predicted_value_usd" in body &&
    typeof body.predicted_value_usd === "number" &&
    Number.isFinite(body.predicted_value_usd)
  );
}

/** One point of a model-response sweep, in model units. */
export type SweepPoint = {
  value: number;
  /** Null when the prediction for this point failed. */
  predicted_value_usd: number | null;
};

/** Response body of this app's POST /api/sweep. */
export type SweepResponse = {
  feature: FeatureName;
  points: SweepPoint[];
};

export function isSweepResponse(body: unknown): body is SweepResponse {
  if (typeof body !== "object" || body === null) return false;
  const { feature, points } = body as Record<string, unknown>;
  return (
    isFeatureName(feature) &&
    Array.isArray(points) &&
    points.every(
      (point) =>
        typeof point?.value === "number" &&
        (point.predicted_value_usd === null || Number.isFinite(point.predicted_value_usd)),
    )
  );
}

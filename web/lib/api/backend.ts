import "server-only";

import { isFeatureName } from "@/lib/housing/features";
import {
  isPredictionResponse,
  type ApiResult,
  type FieldErrors,
  type HousingInput,
  type PredictResult,
} from "@/lib/housing/types";
import { failure } from "./errors";

const DEFAULT_TIMEOUT_MS = 8_000;

/** The API's limit on inputs per POST /predict/batch. */
export const MAX_BATCH_SIZE = 100;

type Options = {
  /** Aborts the call when the incoming request goes away. */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** Calls the prediction API's POST /predict for one input. */
export async function predictFromBackend(
  input: HousingInput,
  options: Options = {},
): Promise<PredictResult> {
  const result = await postToBackend("/predict", input, isPredictionResponse, options);
  return result.ok
    ? { ok: true, data: { predicted_value_usd: result.data.predicted_value_usd } }
    : result;
}

/**
 * Calls the prediction API's POST /predict/batch: one request, one model call,
 * estimates in the same order as `inputs` (at most MAX_BATCH_SIZE).
 */
export async function predictBatchFromBackend(
  inputs: HousingInput[],
  options: Options = {},
): Promise<ApiResult<number[]>> {
  const isBatchResponse = (body: unknown): body is { predicted_values_usd: number[] } =>
    typeof body === "object" &&
    body !== null &&
    "predicted_values_usd" in body &&
    Array.isArray(body.predicted_values_usd) &&
    body.predicted_values_usd.length === inputs.length &&
    body.predicted_values_usd.every((value: unknown) => Number.isFinite(value));

  const result = await postToBackend("/predict/batch", { inputs }, isBatchResponse, options);
  return result.ok ? { ok: true, data: result.data.predicted_values_usd } : result;
}

/**
 * POSTs JSON to the API at BACKEND_URL. Service failures are returned as
 * results, never thrown. The only error it throws is the abort error when
 * `signal` aborts.
 */
async function postToBackend<T>(
  path: string,
  payload: unknown,
  isData: (body: unknown) => body is T,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: Options,
): Promise<ApiResult<T>> {
  const baseUrl = process.env.BACKEND_URL;
  if (!baseUrl) {
    console.error("BACKEND_URL is not set; cannot reach the prediction service.");
    return failure("unavailable");
  }

  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: "no-store",
    });
    body = await response.json().catch(() => undefined);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) return failure("timeout");
    console.error("Prediction service request failed:", error);
    return failure("unavailable");
  }
  // response.json() swallows its own errors, so an abort while reading the body lands here.
  if (signal?.aborted) throw signal.reason;
  if (timeout.aborted) return failure("timeout");

  if (response.status === 422) {
    return failure("validation", fieldErrorsFrom(body));
  }
  if (!response.ok) {
    console.error(`Prediction service responded with HTTP ${response.status}.`);
    return failure("unavailable");
  }
  if (!isData(body)) {
    console.error("Prediction service returned an unexpected body:", body);
    return failure("bad_response");
  }
  return { ok: true, data: body };
}

/**
 * Maps FastAPI's 422 `detail` list to per-field messages. Only single
 * predictions (`loc: ["body", field]`) map to a field; batch errors don't.
 */
function fieldErrorsFrom(body: unknown): FieldErrors {
  const errors: FieldErrors = {};
  const detail =
    typeof body === "object" && body !== null && "detail" in body
      ? body.detail
      : undefined;
  if (!Array.isArray(detail)) return errors;

  for (const item of detail) {
    const field = item?.loc?.[1];
    if (isFeatureName(field) && typeof item.msg === "string") {
      errors[field] ??= `${item.msg}.`;
    }
  }
  return errors;
}

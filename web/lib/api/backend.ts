import "server-only";

import { isFeatureName } from "@/lib/housing/features";
import {
  isPredictionResponse,
  type FieldErrors,
  type HousingInput,
  type PredictResult,
} from "@/lib/housing/types";
import { failure } from "./errors";

const DEFAULT_TIMEOUT_MS = 8_000;

type Options = {
  /** Aborts the call when the incoming request goes away. */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Calls the prediction API's POST /predict at BACKEND_URL. Service failures
 * are returned as results, never thrown. The only error it throws is the
 * abort error when `signal` aborts.
 */
export async function predictFromBackend(
  input: HousingInput,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: Options = {},
): Promise<PredictResult> {
  const baseUrl = process.env.BACKEND_URL;
  if (!baseUrl) {
    console.error("BACKEND_URL is not set; cannot reach the prediction service.");
    return failure("unavailable");
  }

  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
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
  if (!isPredictionResponse(body)) {
    console.error("Prediction service returned an unexpected body:", body);
    return failure("bad_response");
  }
  return { ok: true, data: { predicted_value_usd: body.predicted_value_usd } };
}

/** Maps FastAPI's 422 `detail` list (`loc: ["body", field]`) to per-field messages. */
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

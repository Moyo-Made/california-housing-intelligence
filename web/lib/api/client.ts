import type { FeatureName } from "@/lib/housing/features";
import {
  isPredictionResponse,
  isSweepResponse,
  type ApiResult,
  type HousingInput,
  type PredictResult,
  type SweepResponse,
} from "@/lib/housing/types";
import { failure, isErrorBody } from "./errors";

type Options = { signal?: AbortSignal };

/** Requests a prediction from the app's own /api/predict route. */
export function predict(input: HousingInput, { signal }: Options = {}): Promise<PredictResult> {
  return postJson("/api/predict", input, isPredictionResponse, signal);
}

/** Requests the model's response across one feature from /api/sweep. */
export function sweep(
  { input, feature }: { input: HousingInput; feature: FeatureName },
  { signal }: Options = {},
): Promise<ApiResult<SweepResponse>> {
  return postJson("/api/sweep", { input, feature }, isSweepResponse, signal);
}

/**
 * Posts JSON to one of this app's routes. Failures are returned as results.
 * When `signal` aborts, the abort error is rethrown so callers can tell a
 * superseded request from a failed one.
 */
async function postJson<T>(
  url: string,
  payload: unknown,
  isData: (body: unknown) => body is T,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    body = await response.json().catch(() => undefined);
  } catch (error) {
    if (signal?.aborted) throw error;
    return failure("unavailable");
  }
  if (signal?.aborted) throw signal.reason;

  if (response.ok) {
    return isData(body) ? { ok: true, data: body } : failure("bad_response");
  }
  if (isErrorBody(body)) return { ok: false, error: body.error };
  return failure(response.status === 504 ? "timeout" : "unavailable");
}

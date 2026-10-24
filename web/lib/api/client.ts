import {
  isPredictionResponse,
  type HousingInput,
  type PredictResult,
} from "@/lib/housing/types";
import { failure, isErrorBody } from "./errors";

/**
 * Requests a prediction from the app's own /api/predict route.
 * Failures are returned as results. When `signal` aborts, the abort error
 * is rethrown so callers can tell a superseded request from a failed one.
 */
export async function predict(
  input: HousingInput,
  { signal }: { signal?: AbortSignal } = {},
): Promise<PredictResult> {
  let response: Response;
  let body: unknown;
  try {
    response = await fetch("/api/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    body = await response.json().catch(() => undefined);
  } catch (error) {
    if (signal?.aborted) throw error;
    return failure("unavailable");
  }
  if (signal?.aborted) throw signal.reason;

  if (response.ok) {
    return isPredictionResponse(body)
      ? { ok: true, data: body }
      : failure("bad_response");
  }
  if (isErrorBody(body)) return { ok: false, error: body.error };
  return failure(response.status === 504 ? "timeout" : "unavailable");
}

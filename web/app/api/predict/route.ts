import { predictFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import type { PredictError, PredictErrorKind } from "@/lib/housing/types";
import { validateInput } from "@/lib/housing/validation";

const STATUS: Record<PredictErrorKind, number> = {
  validation: 422,
  unavailable: 503,
  timeout: 504,
  bad_response: 502,
};

/**
 * Same-origin proxy to the prediction API. It re-validates the input, forwards
 * only the eight features, and returns either the API's `{ predicted_value_usd }`
 * unchanged or an `{ error }` body with a user-safe message.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(failure("validation").error, 400);
  }

  const validation = validateInput(body);
  if (!validation.ok) {
    return errorResponse(failure("validation", validation.errors).error);
  }

  try {
    const result = await predictFromBackend(validation.input, {
      signal: request.signal,
    });
    return result.ok ? Response.json(result.data) : errorResponse(result.error);
  } catch (error) {
    // The browser cancelled the request, so nobody will read this response.
    if (request.signal.aborted) return new Response(null, { status: 499 });
    throw error;
  }
}

function errorResponse(error: PredictError, status = STATUS[error.kind]) {
  return Response.json({ error }, { status });
}

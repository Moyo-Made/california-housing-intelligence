import type { PredictError, PredictErrorKind } from "@/lib/housing/types";

const STATUS: Record<PredictErrorKind, number> = {
  validation: 422,
  unavailable: 503,
  timeout: 504,
  bad_response: 502,
};

/** The `{ error }` body this app's API routes return on failure. */
export function errorResponse(error: PredictError, status = STATUS[error.kind]) {
  return Response.json({ error }, { status });
}

/** The browser cancelled the request, so nobody will read this response. */
export function abandonedResponse() {
  return new Response(null, { status: 499 });
}

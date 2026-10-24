import { predictFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import { abandonedResponse, errorResponse } from "@/lib/api/http";
import { validateInput } from "@/lib/housing/validation";

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
    if (request.signal.aborted) return abandonedResponse();
    throw error;
  }
}

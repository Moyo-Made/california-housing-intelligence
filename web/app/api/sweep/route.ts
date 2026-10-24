import { predictBatchFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import { abandonedResponse, errorResponse } from "@/lib/api/http";
import { isFeatureName } from "@/lib/housing/features";
import { sweepValues } from "@/lib/housing/sweep";
import type { SweepResponse } from "@/lib/housing/types";
import { validateInput } from "@/lib/housing/validation";

/**
 * Model response for one feature: asks the prediction API for estimates across
 * a range of that feature while the other seven inputs stay fixed. All points
 * go in one POST /predict/batch, so the model runs once on a single instance
 * instead of starting several in parallel.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(failure("validation").error, 400);
  }

  const { input, feature } = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
  if (!isFeatureName(feature)) {
    return errorResponse(failure("validation").error);
  }
  const validation = validateInput(input);
  if (!validation.ok) {
    return errorResponse(failure("validation", validation.errors).error);
  }

  const values = sweepValues(feature, validation.input[feature]);

  try {
    const result = await predictBatchFromBackend(
      values.map((value) => ({ ...validation.input, [feature]: value })),
      { signal: request.signal },
    );
    if (!result.ok) return errorResponse(result.error);

    return Response.json({
      feature,
      points: values.map((value, i) => ({ value, predicted_value_usd: result.data[i] })),
    } satisfies SweepResponse);
  } catch (error) {
    if (request.signal.aborted) return abandonedResponse();
    throw error;
  }
}

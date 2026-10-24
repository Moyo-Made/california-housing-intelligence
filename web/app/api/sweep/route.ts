import { predictFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import { abandonedResponse, errorResponse } from "@/lib/api/http";
import { isFeatureName } from "@/lib/housing/features";
import { sweepValues } from "@/lib/housing/sweep";
import type { PredictError, SweepResponse } from "@/lib/housing/types";
import { validateInput } from "@/lib/housing/validation";

/** At most this many calls to the prediction API run at once. */
const CONCURRENCY = 5;

/**
 * Model response for one feature: asks the prediction API (unchanged, one
 * POST /predict per point) for estimates across a range of that feature while
 * the other seven inputs stay fixed. Points that fail come back as null; the
 * request fails only if every point does.
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
  let firstError: PredictError | undefined;

  try {
    const estimates = await mapWithConcurrency(values, CONCURRENCY, async (value) => {
      const result = await predictFromBackend(
        { ...validation.input, [feature]: value },
        { signal: request.signal },
      );
      if (result.ok) return result.data.predicted_value_usd;
      firstError ??= result.error;
      return null;
    });

    if (firstError && estimates.every((estimate) => estimate === null)) {
      return errorResponse(firstError);
    }
    return Response.json({
      feature,
      points: values.map((value, i) => ({ value, predicted_value_usd: estimates[i] })),
    } satisfies SweepResponse);
  } catch (error) {
    if (request.signal.aborted) return abandonedResponse();
    throw error;
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

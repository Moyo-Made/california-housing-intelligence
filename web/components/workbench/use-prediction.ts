"use client";

import { predict as predictFromApi } from "@/lib/api/client";
import type { HousingInput, PredictError } from "@/lib/housing/types";
import { useDebouncedRequest, type RequestStatus } from "./use-debounced-request";

export type PredictionStatus = RequestStatus;

export type Prediction = {
  status: PredictionStatus;
  /** The most recent successful estimate, kept while newer ones load or fail. */
  valueUsd: number | null;
  /** True when `valueUsd` doesn't belong to the current inputs. */
  isStale: boolean;
  error: PredictError | null;
  /** The current request has taken longer than `slowMs`. */
  isSlow: boolean;
  retry: () => void;
};

type Options = {
  debounceMs?: number;
  slowMs?: number;
  predict?: typeof predictFromApi;
};

/** The model's estimate for the current inputs; see useDebouncedRequest for timing. */
export function usePrediction(
  input: HousingInput | null,
  { predict = predictFromApi, ...timing }: Options = {},
): Prediction {
  const { data, ...request } = useDebouncedRequest(input, predict, timing);
  return { ...request, valueUsd: data?.predicted_value_usd ?? null };
}

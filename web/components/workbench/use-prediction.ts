"use client";

import { useCallback, useEffect, useState } from "react";
import { predict as predictFromApi } from "@/lib/api/client";
import type { HousingInput, PredictError } from "@/lib/housing/types";

export type PredictionStatus =
  /** Inputs are invalid, so nothing is requested. */
  | "blocked"
  /** Waiting for the debounce or the response. */
  | "loading"
  | "success"
  | "error";

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

type Settled<T> = { key: string; value: T };

/**
 * Requests a prediction shortly after the inputs stop changing. Each change
 * aborts the previous request, and a response is only used if it belongs to
 * the inputs that are current when it arrives.
 */
export function usePrediction(
  input: HousingInput | null,
  { debounceMs = 250, slowMs = 3_000, predict = predictFromApi }: Options = {},
): Prediction {
  // Inputs are compared by value: equal inputs never trigger a second request.
  const key = input ? JSON.stringify(input) : null;

  const [result, setResult] = useState<Settled<number> | null>(null);
  const [failure, setFailure] = useState<Settled<PredictError> | null>(null);
  const [slowKey, setSlowKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    const body = JSON.parse(key) as HousingInput;
    const controller = new AbortController();
    let slowTimer: ReturnType<typeof setTimeout> | undefined;

    const debounceTimer = setTimeout(async () => {
      setSlowKey(null);
      slowTimer = setTimeout(() => setSlowKey(key), slowMs);
      try {
        const outcome = await predict(body, { signal: controller.signal });
        // Inputs changed while waiting; this response is out of date.
        if (controller.signal.aborted) return;
        if (outcome.ok) {
          setResult({ key, value: outcome.data.predicted_value_usd });
        } else {
          setFailure({ key, value: outcome.error });
        }
      } catch {
        // predict() only throws when aborted, which means it was superseded.
      } finally {
        clearTimeout(slowTimer);
      }
    }, debounceMs);

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [key, attempt, debounceMs, slowMs, predict]);

  const retry = useCallback(() => {
    setFailure(null);
    setSlowKey(null);
    setAttempt((n) => n + 1);
  }, []);

  const status: PredictionStatus =
    key === null
      ? "blocked"
      : result?.key === key
        ? "success"
        : failure?.key === key
          ? "error"
          : "loading";

  return {
    status,
    valueUsd: result?.value ?? null,
    isStale: result !== null && result.key !== key,
    error: status === "error" ? failure!.value : null,
    isSlow: status === "loading" && slowKey === key,
    retry,
  };
}

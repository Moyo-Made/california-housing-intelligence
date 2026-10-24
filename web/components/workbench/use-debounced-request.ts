"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResult, PredictError } from "@/lib/housing/types";

export type RequestStatus =
  /** There is nothing valid to send. */
  | "blocked"
  /** Waiting for the debounce or the response. */
  | "loading"
  | "success"
  | "error";

export type DebouncedRequest<T> = {
  status: RequestStatus;
  /** The most recent successful data, kept while newer requests load or fail. */
  data: T | null;
  /** True when `data` doesn't belong to the current body. */
  isStale: boolean;
  error: PredictError | null;
  /** The current request has taken longer than `slowMs`. */
  isSlow: boolean;
  retry: () => void;
};

export type Requester<B, T> = (body: B, options: { signal: AbortSignal }) => Promise<ApiResult<T>>;

type Settled<T> = { key: string; value: T };

/**
 * Sends `body` shortly after it stops changing. Each change aborts the
 * previous request, and a response is only used if it belongs to the body
 * that is current when it arrives. A null body sends nothing.
 */
export function useDebouncedRequest<B, T>(
  body: B | null,
  request: Requester<B, T>,
  { debounceMs = 250, slowMs = 3_000 }: { debounceMs?: number; slowMs?: number } = {},
): DebouncedRequest<T> {
  // Bodies are compared by value: an equal body never triggers a second request.
  const key = body === null ? null : JSON.stringify(body);

  const [result, setResult] = useState<Settled<T> | null>(null);
  const [failure, setFailure] = useState<Settled<PredictError> | null>(null);
  const [slowKey, setSlowKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    const payload = JSON.parse(key) as B;
    const controller = new AbortController();
    let slowTimer: ReturnType<typeof setTimeout> | undefined;

    const debounceTimer = setTimeout(async () => {
      setSlowKey(null);
      slowTimer = setTimeout(() => setSlowKey(key), slowMs);
      try {
        const outcome = await request(payload, { signal: controller.signal });
        // The body changed while waiting; this response is out of date.
        if (controller.signal.aborted) return;
        if (outcome.ok) {
          setResult({ key, value: outcome.data });
        } else {
          setFailure({ key, value: outcome.error });
        }
      } catch {
        // Requests only throw when aborted, which means they were superseded.
      } finally {
        clearTimeout(slowTimer);
      }
    }, debounceMs);

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [key, attempt, debounceMs, slowMs, request]);

  const retry = useCallback(() => {
    setFailure(null);
    setSlowKey(null);
    setAttempt((n) => n + 1);
  }, []);

  const status: RequestStatus =
    key === null
      ? "blocked"
      : result?.key === key
        ? "success"
        : failure?.key === key
          ? "error"
          : "loading";

  return {
    status,
    data: result?.value ?? null,
    isStale: result !== null && result.key !== key,
    error: status === "error" ? failure!.value : null,
    isSlow: status === "loading" && slowKey === key,
    retry,
  };
}

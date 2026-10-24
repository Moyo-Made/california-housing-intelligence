import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { failure } from "@/lib/api/errors";
import type { predict } from "@/lib/api/client";
import type { HousingInput, PredictResult } from "@/lib/housing/types";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { usePrediction } from "./use-prediction";

const A = EXAMPLE_INPUT;
const B = { ...EXAMPLE_INPUT, HouseAge: 20 };

const ok = (usd: number): PredictResult => ({ ok: true, data: { predicted_value_usd: usd } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const predictMock = vi.fn<typeof predict>();

function setup(input: HousingInput | null) {
  return renderHook(({ input }) => usePrediction(input, { predict: predictMock }), {
    initialProps: { input },
  });
}

/** Advances fake time and lets resolved promises settle. */
async function wait(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  predictMock.mockReset();
});

describe("usePrediction", () => {
  test("waits for the inputs to settle before asking", async () => {
    predictMock.mockResolvedValue(ok(430217.29));
    const { result } = setup(A);

    await wait(249);
    expect(predictMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("loading");

    await wait(1);
    expect(predictMock).toHaveBeenCalledTimes(1);
    expect(predictMock.mock.calls[0][0]).toEqual(A);
    expect(result.current).toMatchObject({ status: "success", valueUsd: 430217.29, isStale: false });
  });

  test("never asks while the inputs are invalid", async () => {
    const { result } = setup(null);
    await wait(1_000);

    expect(predictMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("blocked");
  });

  test("sends only the last of several quick changes", async () => {
    predictMock.mockResolvedValue(ok(1));
    const { rerender } = setup(A);

    await wait(100);
    rerender({ input: B });
    await wait(100);
    rerender({ input: A });
    await wait(250);

    expect(predictMock).toHaveBeenCalledTimes(1);
    expect(predictMock.mock.calls[0][0]).toEqual(A);
  });

  test("doesn't ask again for inputs equal to the current ones", async () => {
    predictMock.mockResolvedValue(ok(1));
    const { rerender } = setup(A);
    await wait(250);

    rerender({ input: { ...A } });
    await wait(1_000);

    expect(predictMock).toHaveBeenCalledTimes(1);
  });

  test("ignores a response that arrives after the inputs changed", async () => {
    const first = deferred<PredictResult>();
    predictMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(ok(200_000));
    const { result, rerender } = setup(A);
    await wait(250);

    rerender({ input: B });
    expect(predictMock.mock.calls[0][1]?.signal?.aborted).toBe(true);

    // The old request resolves late (as if the abort were ignored) and must not win.
    first.resolve(ok(999_999));
    await wait(250);

    expect(result.current).toMatchObject({ status: "success", valueUsd: 200_000 });
  });

  test("keeps the last estimate, marked stale, while a new one loads", async () => {
    predictMock.mockResolvedValueOnce(ok(100_000)).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = setup(A);
    await wait(250);

    rerender({ input: B });
    await wait(250);

    expect(result.current).toMatchObject({ status: "loading", valueUsd: 100_000, isStale: true });
  });

  test("reports failures and recovers on retry", async () => {
    predictMock.mockResolvedValueOnce(failure("unavailable")).mockResolvedValueOnce(ok(300_000));
    const { result } = setup(A);
    await wait(250);

    expect(result.current.status).toBe("error");
    expect(result.current.error?.kind).toBe("unavailable");

    act(() => result.current.retry());
    expect(result.current.status).toBe("loading");
    await wait(250);

    expect(predictMock).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: "success", valueUsd: 300_000, error: null });
  });

  test("flags a slow response after three seconds", async () => {
    predictMock.mockReturnValue(new Promise(() => {}));
    const { result } = setup(A);

    await wait(250 + 2_999);
    expect(result.current.isSlow).toBe(false);
    await wait(1);
    expect(result.current.isSlow).toBe(true);
  });
});

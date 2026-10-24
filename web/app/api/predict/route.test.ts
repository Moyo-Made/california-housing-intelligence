// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { predictFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import type { PredictErrorKind } from "@/lib/housing/types";
import { EXAMPLE_INPUT, EXAMPLE_PREDICTION_USD } from "@/test/fixtures";
import { POST } from "./route";

// The backend call has its own tests (lib/api/backend.test.ts) and a contract
// test against the real API; here we only test what the route itself does.
vi.mock("@/lib/api/backend", () => ({ predictFromBackend: vi.fn() }));
const backend = vi.mocked(predictFromBackend);

function post(body: unknown, signal?: AbortSignal) {
  return POST(
    new Request("http://localhost/api/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
      signal,
    }),
  );
}

afterEach(() => {
  backend.mockReset();
});

describe("POST /api/predict", () => {
  test("returns the API's response body unchanged", async () => {
    backend.mockResolvedValue({ ok: true, data: { predicted_value_usd: EXAMPLE_PREDICTION_USD } });

    const response = await post(EXAMPLE_INPUT);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ predicted_value_usd: EXAMPLE_PREDICTION_USD });
  });

  test("forwards only the eight features", async () => {
    backend.mockResolvedValue({ ok: true, data: { predicted_value_usd: EXAMPLE_PREDICTION_USD } });

    await post({ ...EXAMPLE_INPUT, injected: "<script>" });

    expect(backend.mock.calls[0][0]).toEqual(EXAMPLE_INPUT);
  });

  test("rejects invalid input with 422 without calling the API", async () => {
    const response = await post({ ...EXAMPLE_INPUT, MedInc: 0, Latitude: 51.5 });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: {
        kind: "validation",
        message: "Some inputs are missing or invalid.",
        fields: {
          MedInc: "Median household income must be greater than 0.",
          Latitude: "Latitude must be between 32.5 and 42.",
        },
      },
    });
    expect(backend).not.toHaveBeenCalled();
  });

  test("rejects a body that isn't JSON with 400", async () => {
    const response = await post("MedInc=8.3");

    expect(response.status).toBe(400);
    expect((await response.json()).error.kind).toBe("validation");
    expect(backend).not.toHaveBeenCalled();
  });

  test.each([
    ["validation", 422],
    ["unavailable", 503],
    ["timeout", 504],
    ["bad_response", 502],
  ] as const)("maps a %s failure to HTTP %d", async (kind: PredictErrorKind, status) => {
    backend.mockResolvedValue(failure(kind));

    const response = await post(EXAMPLE_INPUT);

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: failure(kind).error });
  });

  test("passes the request's abort signal to the API call", async () => {
    const controller = new AbortController();
    backend.mockImplementation(async (_input, options) => {
      controller.abort();
      throw options?.signal?.reason;
    });

    const response = await post(EXAMPLE_INPUT, controller.signal);

    expect(response.status).toBe(499);
  });
});

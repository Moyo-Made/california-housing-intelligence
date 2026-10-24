// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { MAX_BATCH_SIZE, predictBatchFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import { FEATURE_NAMES } from "@/lib/housing/features";
import { sweepValues } from "@/lib/housing/sweep";
import type { HousingInput } from "@/lib/housing/types";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { POST } from "./route";

// The backend call has its own tests; here only the route's own logic is tested.
vi.mock("@/lib/api/backend", () => ({ predictBatchFromBackend: vi.fn(), MAX_BATCH_SIZE: 100 }));
const backend = vi.mocked(predictBatchFromBackend);

function post(body: unknown, signal?: AbortSignal) {
  return POST(
    new Request("http://localhost/api/sweep", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
      signal,
    }),
  );
}

/** A fake model: $10,000 per unit of income, so results are easy to check. */
const byIncome = async (inputs: HousingInput[]) => ({
  ok: true as const,
  data: inputs.map((input) => input.MedInc * 10_000),
});

afterEach(() => {
  backend.mockReset();
});

describe("POST /api/sweep", () => {
  test("asks for every point in one batch, with only the chosen feature varying", async () => {
    backend.mockImplementation(byIncome);

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" });
    const body = await response.json();

    const values = sweepValues("MedInc", EXAMPLE_INPUT.MedInc);
    expect(response.status).toBe(200);
    expect(backend).toHaveBeenCalledOnce();
    const [inputs] = backend.mock.calls[0];
    expect(inputs.map((input) => input.MedInc)).toEqual(values);
    for (const input of inputs) {
      expect({ ...input, MedInc: EXAMPLE_INPUT.MedInc }).toEqual(EXAMPLE_INPUT);
    }
    expect(body).toEqual({
      feature: "MedInc",
      points: values.map((value) => ({ value, predicted_value_usd: value * 10_000 })),
    });
  });

  test.each(FEATURE_NAMES)("a %s sweep fits in one batch", (feature) => {
    expect(sweepValues(feature, EXAMPLE_INPUT[feature]).length).toBeLessThanOrEqual(MAX_BATCH_SIZE);
  });

  test.each([
    ["unavailable", 503],
    ["timeout", 504],
    ["bad_response", 502],
  ] as const)("passes on an API failure (%s → HTTP %d)", async (kind, status) => {
    backend.mockResolvedValue(failure(kind));

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" });

    expect(response.status).toBe(status);
    expect((await response.json()).error.kind).toBe(kind);
  });

  test.each([
    ["an unknown feature", { input: EXAMPLE_INPUT, feature: "Rooms" }],
    ["invalid inputs", { input: { ...EXAMPLE_INPUT, Latitude: 51 }, feature: "MedInc" }],
    ["a missing input", { feature: "MedInc" }],
  ])("rejects %s without calling the API", async (_, body) => {
    const response = await post(body);
    expect(response.status).toBe(422);
    expect(backend).not.toHaveBeenCalled();
  });

  test("rejects a body that isn't JSON", async () => {
    expect((await post("feature=MedInc")).status).toBe(400);
  });

  test("passes the request's abort signal on and gives up when it fires", async () => {
    const controller = new AbortController();
    backend.mockImplementation(async (_inputs, options) => {
      controller.abort();
      throw options?.signal?.reason;
    });

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" }, controller.signal);

    expect(response.status).toBe(499);
  });
});

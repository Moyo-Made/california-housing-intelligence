// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { predictFromBackend } from "@/lib/api/backend";
import { failure } from "@/lib/api/errors";
import { sweepValues } from "@/lib/housing/sweep";
import type { HousingInput } from "@/lib/housing/types";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { POST } from "./route";

// The backend call has its own tests; here only the route's own logic is tested.
vi.mock("@/lib/api/backend", () => ({ predictFromBackend: vi.fn() }));
const backend = vi.mocked(predictFromBackend);

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
const byIncome = async (input: HousingInput) => ({
  ok: true as const,
  data: { predicted_value_usd: input.MedInc * 10_000 },
});

afterEach(() => {
  backend.mockReset();
});

describe("POST /api/sweep", () => {
  test("estimates each value with only the chosen feature varying", async () => {
    backend.mockImplementation(byIncome);

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" });
    const body = await response.json();

    const values = sweepValues("MedInc", EXAMPLE_INPUT.MedInc);
    expect(response.status).toBe(200);
    expect(body.feature).toBe("MedInc");
    expect(body.points).toEqual(
      values.map((value) => ({ value, predicted_value_usd: value * 10_000 })),
    );
    for (const [input] of backend.mock.calls) {
      expect({ ...input, MedInc: EXAMPLE_INPUT.MedInc }).toEqual(EXAMPLE_INPUT);
    }
  });

  test("never has more than five calls in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    backend.mockImplementation(async (input) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight -= 1;
      return byIncome(input);
    });

    await post({ input: EXAMPLE_INPUT, feature: "HouseAge" });

    expect(peak).toBe(5);
  });

  test("keeps the points that worked when some fail", async () => {
    let call = 0;
    backend.mockImplementation(async (input) =>
      ++call % 4 === 0 ? failure("unavailable") : byIncome(input),
    );

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" });
    const { points } = await response.json();

    expect(response.status).toBe(200);
    expect(points.filter((p: { predicted_value_usd: number | null }) => p.predicted_value_usd === null)).toHaveLength(8);
  });

  test("fails with the API's error when every point fails", async () => {
    backend.mockResolvedValue(failure("timeout"));

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" });

    expect(response.status).toBe(504);
    expect((await response.json()).error.kind).toBe("timeout");
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
    backend.mockImplementation(async (_input, options) => {
      controller.abort();
      throw options?.signal?.reason;
    });

    const response = await post({ input: EXAMPLE_INPUT, feature: "MedInc" }, controller.signal);

    expect(response.status).toBe(499);
  });
});

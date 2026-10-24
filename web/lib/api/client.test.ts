// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  EXAMPLE_INPUT,
  EXAMPLE_PREDICTION_USD,
  hangingFetch,
  jsonResponse,
} from "@/test/fixtures";
import { predict, sweep } from "./client";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("predict", () => {
  test("posts to the app's own route and returns the prediction", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ predicted_value_usd: EXAMPLE_PREDICTION_USD }));

    const result = await predict(EXAMPLE_INPUT);

    expect(result).toEqual({ ok: true, data: { predicted_value_usd: EXAMPLE_PREDICTION_USD } });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/predict");
  });

  test("passes the route's error through", async () => {
    const error = {
      kind: "validation",
      message: "Some inputs are missing or invalid.",
      fields: { MedInc: "Median household income must be greater than 0." },
    };
    fetchMock.mockResolvedValue(jsonResponse({ error }, 422));

    expect(await predict(EXAMPLE_INPUT)).toEqual({ ok: false, error });
  });

  test("reports a network failure as unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await predict(EXAMPLE_INPUT);
    expect(!result.ok && result.error.kind).toBe("unavailable");
  });

  test.each([
    [504, "timeout"],
    [500, "unavailable"],
  ])("maps an HTTP %d without an error body to %s", async (status, kind) => {
    fetchMock.mockResolvedValue(new Response("Gateway problem", { status }));
    const result = await predict(EXAMPLE_INPUT);
    expect(!result.ok && result.error.kind).toBe(kind);
  });

  test("rejects a malformed success body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ predicted_value_usd: "lots" }));
    const result = await predict(EXAMPLE_INPUT);
    expect(!result.ok && result.error.kind).toBe("bad_response");
  });

  test("rethrows when aborted, so superseded requests aren't shown as errors", async () => {
    fetchMock.mockImplementation(hangingFetch());
    const controller = new AbortController();

    const pending = predict(EXAMPLE_INPUT, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("sweep", () => {
  const body = {
    feature: "MedInc",
    points: [
      { value: 1, predicted_value_usd: 150_000 },
      { value: 2, predicted_value_usd: null },
    ],
  };

  test("posts the input and feature to the app's sweep route", async () => {
    fetchMock.mockResolvedValue(jsonResponse(body));

    const result = await sweep({ input: EXAMPLE_INPUT, feature: "MedInc" });

    expect(result).toEqual({ ok: true, data: body });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/sweep");
    expect(JSON.parse(init?.body as string)).toEqual({ input: EXAMPLE_INPUT, feature: "MedInc" });
  });

  test.each([
    ["an unknown feature", { ...body, feature: "Rooms" }],
    ["a non-numeric estimate", { ...body, points: [{ value: 1, predicted_value_usd: "lots" }] }],
    ["missing points", { feature: "MedInc" }],
  ])("rejects %s as a bad response", async (_, response) => {
    fetchMock.mockResolvedValue(jsonResponse(response));
    const result = await sweep({ input: EXAMPLE_INPUT, feature: "MedInc" });
    expect(!result.ok && result.error.kind).toBe("bad_response");
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  EXAMPLE_INPUT,
  EXAMPLE_PREDICTION_USD,
  hangingFetch,
  jsonResponse,
} from "@/test/fixtures";
import { predictBatchFromBackend, predictFromBackend } from "./backend";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BACKEND_URL", "http://backend.test/");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("predictFromBackend", () => {
  test("posts the input to BACKEND_URL/predict and returns the prediction", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ predicted_value_usd: EXAMPLE_PREDICTION_USD }));

    const result = await predictFromBackend(EXAMPLE_INPUT);

    expect(result).toEqual({ ok: true, data: { predicted_value_usd: EXAMPLE_PREDICTION_USD } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/predict");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(EXAMPLE_INPUT);
  });

  test("maps a FastAPI 422 to field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            { type: "greater_than", loc: ["body", "MedInc"], msg: "Input should be greater than 0" },
            { type: "missing", loc: ["body", "AveRooms"], msg: "Field required" },
            { type: "json_invalid", loc: ["body", 0], msg: "JSON decode error" },
          ],
        },
        422,
      ),
    );

    const result = await predictFromBackend(EXAMPLE_INPUT);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: "Some inputs are missing or invalid.",
        fields: { MedInc: "Input should be greater than 0.", AveRooms: "Field required." },
      },
    });
  });

  test("reports an unreachable service as unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }));

    const result = await predictFromBackend(EXAMPLE_INPUT);

    expect(!result.ok && result.error.kind).toBe("unavailable");
    expect(!result.ok && result.error.message).not.toMatch(/ECONNREFUSED|fetch/);
  });

  test("reports a server error as unavailable", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));
    const result = await predictFromBackend(EXAMPLE_INPUT);
    expect(!result.ok && result.error.kind).toBe("unavailable");
  });

  test("reports a missing BACKEND_URL as unavailable without calling fetch", async () => {
    vi.stubEnv("BACKEND_URL", "");
    const result = await predictFromBackend(EXAMPLE_INPUT);
    expect(!result.ok && result.error.kind).toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("gives up after the timeout", async () => {
    fetchMock.mockImplementation(hangingFetch());
    const result = await predictFromBackend(EXAMPLE_INPUT, { timeoutMs: 20 });
    expect(!result.ok && result.error.kind).toBe("timeout");
  });

  test.each([
    ["a non-JSON body", new Response("<html>ok</html>", { status: 200 })],
    ["a missing field", jsonResponse({ value: 1 })],
    ["a non-numeric value", jsonResponse({ predicted_value_usd: "430217.29" })],
    ["a null value", jsonResponse({ predicted_value_usd: null })],
  ])("rejects %s as a bad response", async (_, response) => {
    fetchMock.mockResolvedValue(response);
    const result = await predictFromBackend(EXAMPLE_INPUT);
    expect(!result.ok && result.error.kind).toBe("bad_response");
  });

  test("rethrows when the caller aborts", async () => {
    fetchMock.mockImplementation(hangingFetch());
    const controller = new AbortController();

    const pending = predictFromBackend(EXAMPLE_INPUT, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("predictBatchFromBackend", () => {
  const second = { ...EXAMPLE_INPUT, HouseAge: 10 };

  test("posts all inputs to /predict/batch and returns estimates in order", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ predicted_values_usd: [430217.29, 401000] }));

    const result = await predictBatchFromBackend([EXAMPLE_INPUT, second]);

    expect(result).toEqual({ ok: true, data: [430217.29, 401000] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/predict/batch");
    expect(JSON.parse(init?.body as string)).toEqual({ inputs: [EXAMPLE_INPUT, second] });
  });

  test.each([
    ["the wrong number of estimates", { predicted_values_usd: [1] }],
    ["a non-numeric estimate", { predicted_values_usd: [1, "2"] }],
    ["a missing list", { predicted_value_usd: 1 }],
  ])("rejects %s as a bad response", async (_, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    const result = await predictBatchFromBackend([EXAMPLE_INPUT, second]);
    expect(!result.ok && result.error.kind).toBe("bad_response");
  });

  test("reports an API validation error without per-field messages", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: [{ loc: ["body", "inputs", 0, "MedInc"], msg: "Input should be greater than 0" }] }, 422),
    );
    expect(await predictBatchFromBackend([EXAMPLE_INPUT])).toEqual({
      ok: false,
      error: { kind: "validation", message: "Some inputs are missing or invalid.", fields: {} },
    });
  });
});

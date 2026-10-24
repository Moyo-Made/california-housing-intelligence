// Contract tests against the real prediction API (not mocked).
// Start it first: cd ../api && .venv/bin/uvicorn main:app
// Then: npm run test:contract  (BACKEND_URL defaults to http://127.0.0.1:8000)
import { beforeAll, describe, expect, test } from "vitest";
import { POST } from "@/app/api/predict/route";
import { predictFromBackend } from "@/lib/api/backend";
import { FEATURE_NAMES, FEATURES } from "@/lib/housing/features";
import { EXAMPLE_INPUT, EXAMPLE_PREDICTION_USD } from "@/test/fixtures";

process.env.BACKEND_URL ??= "http://127.0.0.1:8000";
const baseUrl = process.env.BACKEND_URL.replace(/\/+$/, "");

type SchemaProperty = {
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  exclusiveMaximum?: number;
};

let schema: { properties: Record<string, SchemaProperty>; required: string[] };

beforeAll(async () => {
  const response = await fetch(`${baseUrl}/openapi.json`).catch(() => {
    throw new Error(`Prediction API not reachable at ${baseUrl}. Start it before running contract tests.`);
  });
  schema = (await response.json()).components.schemas.HousingInput;
});

describe("API schema", () => {
  test("requires exactly the eight features the frontend sends", () => {
    expect(Object.keys(schema.properties).sort()).toEqual([...FEATURE_NAMES].sort());
    expect([...schema.required].sort()).toEqual([...FEATURE_NAMES].sort());
  });

  // Every value the frontend accepts must also be accepted by the API.
  test.each(FEATURE_NAMES)("frontend limits for %s are within the API's", (name) => {
    const api = schema.properties[name];
    const { min, max } = FEATURES[name].limits;

    const apiMin = api.exclusiveMinimum ?? api.minimum;
    if (apiMin !== undefined) {
      expect(min, `${name} needs a minimum`).toBeDefined();
      const minIsExclusive = api.exclusiveMinimum !== undefined;
      expect(min!.value).toBeGreaterThanOrEqual(apiMin);
      if (min!.value === apiMin && minIsExclusive) expect(min!.inclusive).toBe(false);
    }

    const apiMax = api.exclusiveMaximum ?? api.maximum;
    if (apiMax !== undefined) {
      expect(max, `${name} needs a maximum`).toBeDefined();
      const maxIsExclusive = api.exclusiveMaximum !== undefined;
      expect(max!.value).toBeLessThanOrEqual(apiMax);
      if (max!.value === apiMax && maxIsExclusive) expect(max!.inclusive).toBe(false);
    }
  });
});

describe("POST /predict", () => {
  test("returns the documented prediction for the documented example", async () => {
    expect(await predictFromBackend(EXAMPLE_INPUT)).toEqual({
      ok: true,
      data: { predicted_value_usd: EXAMPLE_PREDICTION_USD },
    });
  });

  test("maps the API's own 422 to field errors", async () => {
    // Bypasses frontend validation on purpose to exercise the API's checks.
    const result = await predictFromBackend({ ...EXAMPLE_INPUT, MedInc: 0 });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: "Some inputs are missing or invalid.",
        fields: { MedInc: "Input should be greater than 0." },
      },
    });
  });

  test("works end to end through the Next.js route handler", async () => {
    const response = await POST(
      new Request("http://localhost/api/predict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(EXAMPLE_INPUT),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ predicted_value_usd: EXAMPLE_PREDICTION_USD });
  });
});

describe("POST /api/sweep (through the real API)", () => {
  test("passes through the current estimate and stays within the data's range", async () => {
    const { POST: sweepRoute } = await import("@/app/api/sweep/route");
    const response = await sweepRoute(
      new Request("http://localhost/api/sweep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: EXAMPLE_INPUT, feature: "MedInc" }),
      }),
    );
    const { points } = await response.json();

    expect(response.status).toBe(200);
    expect(points).toContainEqual({ value: EXAMPLE_INPUT.MedInc, predicted_value_usd: EXAMPLE_PREDICTION_USD });
    for (const point of points) {
      expect(point.predicted_value_usd).toBeGreaterThanOrEqual(14_999);
      expect(point.predicted_value_usd).toBeLessThanOrEqual(500_001);
    }
  }, 30_000); // about 32 API calls over the network
});

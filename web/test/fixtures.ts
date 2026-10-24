import type { HousingInput } from "@/lib/housing/types";

/** Row 0 of notebook/california_housing.csv, the API's documented example. */
export const EXAMPLE_INPUT: HousingInput = {
  MedInc: 8.3252,
  HouseAge: 41,
  AveRooms: 6.984127,
  AveBedrms: 1.02381,
  Population: 322,
  AveOccup: 2.555556,
  Latitude: 37.88,
  Longitude: -122.23,
};

/** What the served model returns for EXAMPLE_INPUT. */
export const EXAMPLE_PREDICTION_USD = 430217.29;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A fetch that never settles until its signal aborts, then rejects with the abort reason. */
export function hangingFetch() {
  return (_url: unknown, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    });
}

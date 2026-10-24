// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isInCalifornia, MAP_BOUNDS, MAP_SIZE, project, unproject } from "./california";

describe("isInCalifornia", () => {
  test.each([
    ["Berkeley hills (row 0)", 37.88, -122.23],
    ["central San Francisco", 37.77, -122.42],
    ["downtown Los Angeles", 34.05, -118.24],
    ["Fresno", 36.74, -119.79],
    ["Eureka", 40.8, -124.16],
    ["Avalon, Santa Catalina Island", 33.34, -118.33],
    ["Death Valley", 36.46, -116.87],
  ])("%s is inside", (_, lat, lon) => {
    expect(isInCalifornia(lat, lon)).toBe(true);
  });

  test.each([
    ["Las Vegas, Nevada", 36.17, -115.14],
    ["Reno, Nevada", 39.53, -119.81],
    ["the Pacific, about 180 km offshore", 37, -124.4],
    ["western Arizona", 33.45, -114.2],
    ["north-east Nevada", 41.95, -114.5],
  ])("%s is outside", (_, lat, lon) => {
    expect(isInCalifornia(lat, lon)).toBe(false);
  });

  // The 10 km tolerance exists for these points; no real record may be flagged.
  test("no location in the training data is flagged as outside", () => {
    const rows = readFileSync(new URL("../../../notebook/california_housing.csv", import.meta.url), "utf8")
      .trim()
      .split("\n")
      .slice(1);
    const flagged = rows.filter((row) => {
      const cells = row.split(",");
      return !isInCalifornia(Number(cells[6]), Number(cells[7]));
    });

    expect(rows).toHaveLength(20_640);
    expect(flagged).toEqual([]);
  });
});

describe("map projection", () => {
  test("puts the north-west corner at the origin", () => {
    expect(project(MAP_BOUNDS.north, MAP_BOUNDS.west)).toEqual({ x: 0, y: 0 });
    const corner = project(MAP_BOUNDS.south, MAP_BOUNDS.east);
    expect(corner.x).toBeCloseTo(MAP_SIZE.width);
    expect(corner.y).toBeCloseTo(MAP_SIZE.height);
  });

  test("round-trips coordinates", () => {
    const { x, y } = project(37.88, -122.23);
    const back = unproject(x, y);
    expect(back.latitude).toBeCloseTo(37.88, 10);
    expect(back.longitude).toBeCloseTo(-122.23, 10);
  });
});

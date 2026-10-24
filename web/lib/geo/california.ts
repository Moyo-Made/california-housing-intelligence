import { FEATURES } from "@/lib/housing/features";
import outline from "./california-outline.json";

/** [longitude, latitude] rings: the mainland and the Channel Islands. */
export const CALIFORNIA_RINGS = outline.rings as [number, number][][];

/**
 * Every training location lies within 9.9 km of this outline. Some sit just
 * offshore, because the outline is simplified and the data rounds coordinates
 * to two decimals. So a point only counts as outside beyond 10 km.
 */
const TOLERANCE_KM = 10;
const KM_PER_DEGREE = 111.32;

export function isInCalifornia(latitude: number, longitude: number): boolean {
  return (
    insideRings(longitude, latitude) ||
    distanceToOutlineKm(longitude, latitude) <= TOLERANCE_KM
  );
}

/** Even-odd ray casting across all rings. */
function insideRings(lon: number, lat: number): boolean {
  let inside = false;
  for (const ring of CALIFORNIA_RINGS) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** Shortest distance to any edge, on a local equirectangular approximation. */
function distanceToOutlineKm(lon: number, lat: number): number {
  const k = Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (const ring of CALIFORNIA_RINGS) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = ring[i - 1];
      const [bx, by] = ring[i];
      const dx = (bx - ax) * k;
      const dy = by - ay;
      const px = (lon - ax) * k;
      const py = lat - ay;
      const t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(px - t * dx, py - t * dy));
    }
  }
  return best * KM_PER_DEGREE;
}

/**
 * The map covers the latitude and longitude limits the app accepts, drawn in
 * an equirectangular projection scaled for California's middle latitude.
 * Units are degrees of latitude.
 */
export const MAP_BOUNDS = {
  west: FEATURES.Longitude.limits.min!.value,
  east: FEATURES.Longitude.limits.max!.value,
  south: FEATURES.Latitude.limits.min!.value,
  north: FEATURES.Latitude.limits.max!.value,
};
const X_SCALE = Math.cos((((MAP_BOUNDS.north + MAP_BOUNDS.south) / 2) * Math.PI) / 180);

export const MAP_SIZE = {
  width: (MAP_BOUNDS.east - MAP_BOUNDS.west) * X_SCALE,
  height: MAP_BOUNDS.north - MAP_BOUNDS.south,
};

export function project(latitude: number, longitude: number): { x: number; y: number } {
  return {
    x: (longitude - MAP_BOUNDS.west) * X_SCALE,
    y: MAP_BOUNDS.north - latitude,
  };
}

export function unproject(x: number, y: number): { latitude: number; longitude: number } {
  return {
    latitude: MAP_BOUNDS.north - y,
    longitude: MAP_BOUNDS.west + x / X_SCALE,
  };
}

/** SVG path data for the outline in map units. */
export const OUTLINE_PATH = CALIFORNIA_RINGS.map(
  (ring) =>
    "M" +
    ring
      .map(([lon, lat]) => {
        const { x, y } = project(lat, lon);
        return `${x.toFixed(3)},${y.toFixed(3)}`;
      })
      .join("L") +
    "Z",
).join("");

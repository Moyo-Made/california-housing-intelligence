import { FEATURE_NAMES, FEATURES } from "./features";
import type { HousingInput } from "./types";

export type Provenance =
  /** Built from statistics, not a recorded block group. */
  | { kind: "synthetic" }
  /** A row of notebook/california_housing.csv, unchanged. */
  | { kind: "record"; row: number; place: string }
  /** Edited by the user. */
  | { kind: "constructed" };

export type Preset = {
  id: string;
  label: string;
  provenance: Exclude<Provenance, { kind: "constructed" }>;
  values: HousingInput;
};

const medianProfile = Object.fromEntries(
  FEATURE_NAMES.map((name) => [name, FEATURES[name].stats.median]),
) as HousingInput;

// Real rows copied at full precision from notebook/california_housing.csv
// (row = pandas index). Apart from row 0, each is the row closest to that
// city's centre, all within 0.5 km.
export const PRESETS: readonly Preset[] = [
  {
    id: "median",
    label: "Median of every feature",
    provenance: { kind: "synthetic" },
    values: medianProfile,
  },
  {
    id: "row-0",
    label: "Berkeley hills",
    provenance: { kind: "record", row: 0, place: "Berkeley hills" },
    values: {
      MedInc: 8.3252,
      HouseAge: 41,
      AveRooms: 6.984126984126984,
      AveBedrms: 1.0238095238095235,
      Population: 322,
      AveOccup: 2.555555555555556,
      Latitude: 37.88,
      Longitude: -122.23,
    },
  },
  {
    id: "row-15760",
    label: "Central San Francisco",
    provenance: { kind: "record", row: 15760, place: "central San Francisco" },
    values: {
      MedInc: 2.5186,
      HouseAge: 52,
      AveRooms: 3.00831024930748,
      AveBedrms: 0.9667590027700832,
      Population: 589,
      AveOccup: 1.631578947368421,
      Latitude: 37.77,
      Longitude: -122.42,
    },
  },
  {
    id: "row-4551",
    label: "Downtown Los Angeles",
    provenance: { kind: "record", row: 4551, place: "downtown Los Angeles" },
    values: {
      MedInc: 0.8288,
      HouseAge: 13,
      AveRooms: 2.5455904334828103,
      AveBedrms: 1.0418535127055306,
      Population: 1823,
      AveOccup: 2.724962630792227,
      Latitude: 34.05,
      Longitude: -118.24,
    },
  },
  {
    id: "row-14325",
    label: "Downtown San Diego",
    provenance: { kind: "record", row: 14325, place: "downtown San Diego" },
    values: {
      MedInc: 0.9142,
      HouseAge: 52,
      AveRooms: 2.0153452685421995,
      AveBedrms: 1.184143222506394,
      Population: 805,
      AveOccup: 2.0588235294117645,
      Latitude: 32.72,
      Longitude: -117.16,
    },
  },
  {
    id: "row-12477",
    label: "Central Sacramento",
    provenance: { kind: "record", row: 12477, place: "central Sacramento" },
    values: {
      MedInc: 1.4034,
      HouseAge: 52,
      AveRooms: 3.567164179104477,
      AveBedrms: 1.1011608623548923,
      Population: 1146,
      AveOccup: 1.900497512437811,
      Latitude: 38.58,
      Longitude: -121.49,
    },
  },
  {
    id: "row-2003",
    label: "Central Fresno",
    provenance: { kind: "record", row: 2003, place: "central Fresno" },
    values: {
      MedInc: 1.0513,
      HouseAge: 35,
      AveRooms: 2.9515570934256057,
      AveBedrms: 1.0242214532871972,
      Population: 1228,
      AveOccup: 4.249134948096886,
      Latitude: 36.74,
      Longitude: -119.79,
    },
  },
];

export const DEFAULT_PRESET_ID = "median";

export function getPreset(id: string): Preset {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return preset;
}

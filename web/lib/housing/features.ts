/** The model's eight inputs, spelled exactly as the API and the trained model expect. */
export const FEATURE_NAMES = [
  "MedInc",
  "HouseAge",
  "AveRooms",
  "AveBedrms",
  "Population",
  "AveOccup",
  "Latitude",
  "Longitude",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export function isFeatureName(value: unknown): value is FeatureName {
  return (FEATURE_NAMES as readonly unknown[]).includes(value);
}

type Limit = { value: number; inclusive: boolean };

/** Distribution of a feature in the training data, in model units. */
export type FeatureStats = {
  min: number;
  p1: number;
  median: number;
  p99: number;
  max: number;
};

export type FeatureSpec = {
  label: string;
  /** Unit of the value sent to the model. */
  unit: string;
  /**
   * Requests outside these limits are blocked. They mirror the API's Pydantic
   * constraints, except latitude/longitude, which are narrowed to California's
   * bounding box as a product rule (the API accepts the whole globe).
   */
  limits: { min?: Limit; max?: Limit };
  stats: FeatureStats;
};

// Stats come from notebook/feature_stats.py run on notebook/california_housing.csv.
export const FEATURES: Record<FeatureName, FeatureSpec> = {
  MedInc: {
    label: "Median household income",
    unit: "tens of thousands of US dollars (1990)",
    limits: { min: { value: 0, inclusive: false } },
    stats: { min: 0.4999, p1: 1.0696, median: 3.5348, p99: 10.5965, max: 15.0001 },
  },
  HouseAge: {
    label: "Median house age",
    unit: "years",
    limits: { min: { value: 0, inclusive: true } },
    stats: { min: 1, p1: 4, median: 29, p99: 52, max: 52 },
  },
  AveRooms: {
    label: "Average rooms per household",
    unit: "rooms",
    limits: { min: { value: 0, inclusive: false } },
    stats: { min: 0.8462, p1: 2.5811, median: 5.2291, p99: 10.357, max: 141.9091 },
  },
  AveBedrms: {
    label: "Average bedrooms per household",
    unit: "bedrooms",
    limits: { min: { value: 0, inclusive: true } },
    stats: { min: 0.3333, p1: 0.8728, median: 1.0488, p99: 2.1275, max: 34.0667 },
  },
  Population: {
    label: "Population",
    unit: "people",
    limits: { min: { value: 0, inclusive: true } },
    stats: { min: 3, p1: 88, median: 1166, p99: 5805.83, max: 35682 },
  },
  AveOccup: {
    label: "Average people per household",
    unit: "people",
    limits: { min: { value: 0, inclusive: false } },
    stats: { min: 0.6923, p1: 1.5367, median: 2.8181, p99: 5.3948, max: 1243.3333 },
  },
  Latitude: {
    label: "Latitude",
    unit: "degrees north",
    limits: {
      min: { value: 32.5, inclusive: true },
      max: { value: 42, inclusive: true },
    },
    stats: { min: 32.54, p1: 32.68, median: 34.26, p99: 40.6261, max: 41.95 },
  },
  Longitude: {
    label: "Longitude",
    unit: "degrees east",
    limits: {
      min: { value: -124.5, inclusive: true },
      max: { value: -114.1, inclusive: true },
    },
    stats: { min: -124.35, p1: -123.22, median: -118.49, p99: -116.29, max: -114.31 },
  },
};

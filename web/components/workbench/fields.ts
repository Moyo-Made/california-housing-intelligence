import type { FeatureName } from "@/lib/housing/features";

export type FieldConfig = {
  /** Display value = model value × scale. Income is shown in dollars. */
  scale: number;
  /** Decimal places shown in the input. */
  decimals: number;
  /** Show thousands separators. */
  grouping?: boolean;
  prefix?: string;
  suffix?: string;
  /** Arrow-key step in display units; Shift multiplies it by 10. */
  step: number;
  /** A slider is added only where the range is narrow enough to be precise. */
  slider?: { min: number; max: number; step: number };
  help: string;
};

export const FIELD_GROUPS: readonly {
  id: string;
  title: string;
  features: readonly FeatureName[];
}[] = [
  { id: "location", title: "Location", features: ["Latitude", "Longitude"] },
  {
    id: "people",
    title: "Income and people",
    features: ["MedInc", "Population", "AveOccup"],
  },
  {
    id: "housing",
    title: "Housing stock",
    features: ["HouseAge", "AveRooms", "AveBedrms"],
  },
];

export const FIELDS: Record<FeatureName, FieldConfig> = {
  MedInc: {
    scale: 10_000,
    decimals: 0,
    grouping: true,
    prefix: "$",
    suffix: "a year",
    step: 1_000,
    slider: { min: 5_000, max: 150_000, step: 1_000 },
    help: "The middle household income in the area, per year, in 1990 dollars (not adjusted for inflation). The model receives it in tens of thousands, so $83,252 is sent as 8.3252. Incomes above $150,000 were all recorded as $150,001, so the model can't tell higher incomes apart.",
  },
  HouseAge: {
    scale: 1,
    decimals: 0,
    suffix: "years",
    step: 1,
    slider: { min: 1, max: 52, step: 1 },
    help: "The middle age of the homes in the area. Ages of 52 years or more were all recorded as 52, so the model treats all older housing the same.",
  },
  AveRooms: {
    scale: 1,
    decimals: 2,
    suffix: "rooms",
    step: 0.1,
    slider: { min: 1, max: 10, step: 0.1 },
    help: "Total rooms in the area divided by the number of households. It counts every room, bedrooms included.",
  },
  AveBedrms: {
    scale: 1,
    decimals: 2,
    suffix: "bedrooms",
    step: 0.01,
    help: "Total bedrooms in the area divided by the number of households. Most areas in the data are close to 1.",
  },
  Population: {
    scale: 1,
    decimals: 0,
    grouping: true,
    suffix: "people",
    step: 10,
    help: "How many people live in the area. Census block groups are drawn to hold roughly 600 to 3,000 people.",
  },
  AveOccup: {
    scale: 1,
    decimals: 2,
    suffix: "people",
    step: 0.1,
    help: "The area's population divided by its number of households. Very high values often come from group housing such as student dormitories.",
  },
  Latitude: {
    scale: 1,
    decimals: 2,
    suffix: "°N",
    step: 0.01,
    help: "How far north the area is. California runs from about 32.5 (the Mexican border) to 42 (the Oregon border).",
  },
  Longitude: {
    scale: 1,
    decimals: 2,
    suffix: "°",
    step: 0.01,
    help: "How far east or west the area is. Values west of Greenwich are negative: California runs from about −124.4 on the coast to −114.1 at the Arizona border.",
  },
};

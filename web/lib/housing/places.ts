/**
 * City-centre coordinates for "Place near…". Choosing one only moves the
 * location; the other inputs stay as they are, so the result is constructed
 * inputs, not a real block group.
 */
export const PLACES: readonly { name: string; latitude: number; longitude: number }[] = [
  { name: "Bakersfield", latitude: 35.37, longitude: -119.02 },
  { name: "Eureka", latitude: 40.8, longitude: -124.16 },
  { name: "Fresno", latitude: 36.74, longitude: -119.79 },
  { name: "Los Angeles", latitude: 34.05, longitude: -118.24 },
  { name: "Oakland", latitude: 37.8, longitude: -122.27 },
  { name: "Palm Springs", latitude: 33.83, longitude: -116.55 },
  { name: "Redding", latitude: 40.59, longitude: -122.39 },
  { name: "Sacramento", latitude: 38.58, longitude: -121.49 },
  { name: "San Diego", latitude: 32.72, longitude: -117.16 },
  { name: "San Francisco", latitude: 37.77, longitude: -122.42 },
  { name: "San Jose", latitude: 37.34, longitude: -121.89 },
  { name: "Santa Barbara", latitude: 34.42, longitude: -119.7 },
];

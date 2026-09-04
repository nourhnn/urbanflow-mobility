export type EmissionMode =
  | "walking"
  | "cycling"
  | "driving"
  | "metro"
  | "bus"
  | "tram"
  | "train";

export const EMISSION_FACTORS: Record<
  EmissionMode,
  number
> = {
  walking: 0,
  cycling: 0,
  driving: 0.192,
  metro: 0.004,
  bus: 0.105,
  tram: 0.003,
  train: 0.006,
};

export const CAR_REFERENCE_FACTOR =
  EMISSION_FACTORS.driving;
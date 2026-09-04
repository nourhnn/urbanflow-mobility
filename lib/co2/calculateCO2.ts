import {
  CAR_REFERENCE_FACTOR,
  EMISSION_FACTORS,
  type EmissionMode,
} from "./emissionFactors";

export type CO2Segment = {
  mode: EmissionMode;
  distanceMeters: number;
};

export type CO2Result = {
  tripCO2Kg: number;
  referenceCarCO2Kg: number;
  co2SavedKg: number;
  flowsPotential: number;
};

function round(
  value: number,
  decimals = 3
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

export function calculateCO2(
  segments: CO2Segment[]
): CO2Result {
  const totalDistanceKm =
    segments.reduce(
      (total, segment) =>
        total +
        segment.distanceMeters /
          1000,
      0
    );

  const tripCO2Kg =
    segments.reduce(
      (total, segment) => {
        const distanceKm =
          segment.distanceMeters /
          1000;

        const factor =
          EMISSION_FACTORS[
            segment.mode
          ];

        return (
          total +
          distanceKm * factor
        );
      },
      0
    );

  const referenceCarCO2Kg =
    totalDistanceKm *
    CAR_REFERENCE_FACTOR;

  const co2SavedKg =
    Math.max(
      0,
      referenceCarCO2Kg -
        tripCO2Kg
    );

  const flowsPotential =
    Math.round(
      co2SavedKg * 100
    );

  return {
    tripCO2Kg:
      round(
        tripCO2Kg
      ),

    referenceCarCO2Kg:
      round(
        referenceCarCO2Kg
      ),

    co2SavedKg:
      round(
        co2SavedKg
      ),

    flowsPotential,
  };
}
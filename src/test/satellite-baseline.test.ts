import { describe, expect, it } from "vitest";
import { formatPercentageDeviation, getPercentageDeviation, type SatellitePoint } from "@/routes/warnings";

function point(overrides: Partial<SatellitePoint>): SatellitePoint {
  return {
    point_id: "test-point",
    grid_lat: 28.6,
    grid_lon: 77.2,
    pollutant: "NO2",
    unit: "mol/m²",
    window_start: "2024-11-12",
    window_end_exclusive: "2024-11-18",
    baseline_n: 36,
    baseline_mean: 0.0002,
    anomaly_difference: 0.00005,
    anomaly_z_score: 1.2,
    anomaly_direction: "above_baseline",
    baseline_status: "available",
    score_available: true,
    negative_retrieval: false,
    ...overrides,
  };
}

describe("Sentinel-5P baseline presentation rules", () => {
  it("excludes negative retrievals from percentage calculations", () => {
    const observation = point({ negative_retrieval: true });
    expect(getPercentageDeviation(observation)).toBeNull();
    expect(formatPercentageDeviation(observation)).toBe("Not calculated — negative retrieval");
  });

  it("calculates a valid relative deviation without converting it to a risk score", () => {
    expect(getPercentageDeviation(point({}))).toBe(25);
    expect(formatPercentageDeviation(point({}))).toBe("+25.00%");
  });

  it("does not calculate percentages without a positive finite baseline", () => {
    expect(getPercentageDeviation(point({ baseline_mean: 0 }))).toBeNull();
    expect(getPercentageDeviation(point({ baseline_mean: null }))).toBeNull();
  });
});

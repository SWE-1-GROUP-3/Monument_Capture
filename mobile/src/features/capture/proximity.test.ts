import { describe, expect, it } from "vitest";

import { captureMonument } from "../../data/captureMonument";
import { evaluateCaptureProximity } from "./proximity";

describe("capture proximity evaluation", () => {
  it("allows a player with an accurate location inside the capture radius", () => {
    expect(evaluateCaptureProximity(captureMonument, {
      latitude: captureMonument.latitude,
      longitude: captureMonument.longitude,
      accuracyMeters: 10,
    })).toEqual({ status: "eligible", distanceMeters: 0 });
  });

  it("allows a player exactly on the configured radius boundary", () => {
    const result = evaluateCaptureProximity(
      { ...captureMonument, latitude: 0, longitude: 0, captureRadiusMeters: 100 },
      { latitude: 0.000899, longitude: 0, accuracyMeters: 10 },
    );
    expect(result.status).toBe("eligible");
  });

  it("blocks a player outside the capture radius", () => {
    const result = evaluateCaptureProximity(
      { ...captureMonument, latitude: 0, longitude: 0, captureRadiusMeters: 100 },
      { latitude: 0.002, longitude: 0, accuracyMeters: 10 },
    );
    expect(result.status).toBe("outside");
    if (result.status === "outside") {
      expect(result.distanceMeters).toBeGreaterThan(100);
      expect(result.metersToMoveCloser).toBe(result.distanceMeters - 100);
    }
  });

  it.each([null, 0, 51, Number.NaN])(
    "requires a retry when accuracy is %s meters",
    (accuracyMeters) => {
      expect(evaluateCaptureProximity(captureMonument, {
        latitude: captureMonument.latitude,
        longitude: captureMonument.longitude,
        accuracyMeters,
      })).toEqual({ status: "inaccurate" });
    },
  );

  it("rejects invalid coordinates instead of calculating eligibility", () => {
    expect(evaluateCaptureProximity(captureMonument, {
      latitude: Number.NaN,
      longitude: captureMonument.longitude,
      accuracyMeters: 10,
    })).toEqual({ status: "inaccurate" });
  });
});

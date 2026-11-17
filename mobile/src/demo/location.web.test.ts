import { expect, it, vi } from "vitest";
import { getCapturePosition, LOCATION_REQUEST_TIMEOUT_MS } from "./location.web";

it("requests an uncached accurate location and preserves its original timestamp", async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) => success({
    coords: { latitude: 40.7312, longitude: -73.9971, accuracy: 8 },
    timestamp: 12345,
  } as GeolocationPosition));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  expect(await getCapturePosition()).toEqual({ ok: true, position: {
    latitude: 40.7312, longitude: -73.9971, accuracyMeters: 8, timestampMs: 12345,
  } });
  expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
    enableHighAccuracy: true, maximumAge: 0, timeout: LOCATION_REQUEST_TIMEOUT_MS,
  });
});

it.each([1, 2, 3])("returns an actionable browser location failure (%s)", async code => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code } as GeolocationPositionError),
  } });
  expect(await getCapturePosition()).toMatchObject({ ok: false, code: code === 1 ? "permission-denied" : "unavailable" });
});

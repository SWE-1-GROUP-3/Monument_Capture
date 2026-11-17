// Capture eligibility needs a fresh reading. Expo's web adapter permits an
// indefinitely cached position, so use browser geolocation explicitly here.
import type { PositionResult } from "./location";
import { LOCATION_REQUEST_TIMEOUT_MS } from "./locationConfig";

export { LOCATION_REQUEST_TIMEOUT_MS };

export function getCapturePosition(): Promise<PositionResult> {
  return new Promise(resolve => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, code: "unavailable", message: "Location is unavailable in this browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      location => resolve({ ok: true, position: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy,
        timestampMs: location.timestamp,
      } }),
      error => resolve({ ok: false, code: error.code === 1 ? "permission-denied" : "unavailable",
        message: error.code === 1
          ? "Location permission is required to verify your capture."
          : error.code === 3
            ? "The location check timed out. Retry when location services are ready."
            : "Your location is currently unavailable. Check location services and retry.",
      }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: LOCATION_REQUEST_TIMEOUT_MS },
    );
  });
}

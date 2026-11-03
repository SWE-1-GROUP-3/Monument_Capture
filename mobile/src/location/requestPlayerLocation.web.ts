import type { MapCoordinate } from "../types/mapMonument";

export function requestPlayerLocation(): Promise<MapCoordinate> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location unavailable in this browser. You can still explore the map."));
      return;
    }
    // The browser requests permission before returning any coordinates.
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(error.code === 1
        ? "Location permission denied. You can still explore the map."
        : "Location unavailable. You can still explore the map.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}

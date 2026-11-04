import * as Location from "expo-location";
import type { MapCoordinate } from "../types/mapMonument";

export async function requestPlayerLocation(): Promise<MapCoordinate> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission denied. You can still explore the map.");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A settled race ignores late native results, including after a manual retry.
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Location timeout")), 15000);
      }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (error) {
    const reason = error instanceof Error && error.message === "Location timeout"
      ? "Location unavailable (request timed out)."
      : "Location unavailable.";
    throw new Error(`${reason} You can still explore the map.`);
  } finally {
    clearTimeout(timer);
  }
}

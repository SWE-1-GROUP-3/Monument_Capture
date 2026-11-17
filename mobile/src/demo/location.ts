// Where the capture flow gets the player's current device position.

import * as Location from "expo-location";

import type { PlayerPosition } from "../features/capture/types";
export type PositionResult =
  | { ok: true; position: PlayerPosition }
  | { ok: false; code: "permission-denied" | "unavailable"; message: string };

export const LOCATION_REQUEST_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Location request timed out")),
          LOCATION_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getCapturePosition(): Promise<PositionResult> {
  try {
    const permission = await withTimeout(Location.requestForegroundPermissionsAsync());
    if (permission.status !== "granted") {
      return { ok: false, code: "permission-denied", message: "Location permission is required before you can start a capture." };
    }
    const location = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    );
    return {
      ok: true,
      position: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy,
        timestampMs: location.timestamp,
      },
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "Location request timed out";
    return {
      ok: false,
      code: "unavailable",
      message: timedOut
        ? "The location check timed out. Retry when location services are ready."
        : "Your location is currently unavailable. Check location services and retry.",
    };
  }
}

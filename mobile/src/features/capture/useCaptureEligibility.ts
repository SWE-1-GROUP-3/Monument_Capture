import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";

import { evaluateCaptureProximity } from "./proximity";
import type { CaptureCheckState, CaptureMonument } from "./types";

const IDLE_STATE: CaptureCheckState = {
  status: "idle",
  message: "Check your location to confirm that you are close enough to begin.",
};

export const LOCATION_REQUEST_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Location request timed out")), LOCATION_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function useCaptureEligibility(monument: CaptureMonument) {
  const [state, setState] = useState<CaptureCheckState>(IDLE_STATE);
  const pending = useRef(false);

  const verify = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setState({ status: "checking", message: "Checking your location…" });

    try {
      const permission = await withTimeout(Location.requestForegroundPermissionsAsync());
      if (permission.status !== "granted") {
        setState({
          status: "permission-denied",
          message: "Location permission is required before you can start a capture.",
        });
        return;
      }

      const location = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      );
      const evaluation = evaluateCaptureProximity(monument, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy,
        timestampMs: location.timestamp,
      });

      if (evaluation.status === "stale") {
        setState({
          status: "stale",
          message: "The location result was too old to verify your visit. Retry for a current location.",
        });
        return;
      }

      if (evaluation.status === "inaccurate") {
        setState({
          status: "inaccurate",
          message: "Your location could not be verified accurately enough. Move to an open area and retry.",
        });
        return;
      }

      if (evaluation.status === "outside") {
        setState({
          status: "outside",
          distanceMeters: evaluation.distanceMeters,
          message: `You are about ${evaluation.distanceMeters} m away. Move at least ${evaluation.metersToMoveCloser} m closer and retry.`,
        });
        return;
      }

      setState({
        status: "eligible",
        distanceMeters: evaluation.distanceMeters,
        message: `Location verified. You are about ${evaluation.distanceMeters} m from the monument.`,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.message === "Location request timed out";
      setState({
        status: "unavailable",
        message: timedOut
          ? "The location check timed out. Retry when location services are ready."
          : "Your location is currently unavailable. Check location services and retry.",
      });
    } finally {
      pending.current = false;
    }
  }, [monument]);

  const reset = useCallback(() => setState(IDLE_STATE), []);

  return { state, verify, reset };
}

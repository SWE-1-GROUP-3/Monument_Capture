import * as Location from "expo-location";
import { useCallback, useState } from "react";

import { evaluateCaptureProximity } from "./proximity";
import type { CaptureCheckState, CaptureMonument } from "./types";

const IDLE_STATE: CaptureCheckState = {
  status: "idle",
  message: "Check your location to confirm that you are close enough to begin.",
};

export function useCaptureEligibility(monument: CaptureMonument) {
  const [state, setState] = useState<CaptureCheckState>(IDLE_STATE);

  const verify = useCallback(async () => {
    setState({ status: "checking", message: "Checking your location…" });

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setState({
          status: "permission-denied",
          message: "Location permission is required before you can start a capture.",
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const evaluation = evaluateCaptureProximity(monument, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy,
      });

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
    } catch {
      setState({
        status: "unavailable",
        message: "Your location is currently unavailable. Check location services and retry.",
      });
    }
  }, [monument]);

  const reset = useCallback(() => setState(IDLE_STATE), []);

  return { state, verify, reset };
}

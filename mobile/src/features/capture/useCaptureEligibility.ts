import { useCallback, useEffect, useRef, useState } from "react";

import {
  getCapturePosition,
  LOCATION_REQUEST_TIMEOUT_MS,
} from "../../demo/location";
import { demo } from "../../demo/store";
import type { CaptureCheckState, PlayerPosition } from "./types";

export { LOCATION_REQUEST_TIMEOUT_MS };

const IDLE_STATE: CaptureCheckState = {
  status: "idle",
  message: "Check your location to confirm that you are close enough to begin.",
};

/**
 * Runs the capture checks for one monument: location permission, GPS freshness,
 * accuracy, distance, lock and duplicate checks (see demo/rules.ts).
 * When eligible, `position` holds the exact fix used for the capture record.
 */
export function useCaptureEligibility(monumentId: string | undefined, playerId: string | undefined) {
  const [state, setState] = useState<CaptureCheckState>(IDLE_STATE);
  const [checked, setChecked] = useState<{ position: PlayerPosition; simulated: boolean } | null>(null);
  const pending = useRef(false);

  // A different monument means a fresh check.
  useEffect(() => {
    setState(IDLE_STATE);
    setChecked(null);
    pending.current = false;
  }, [monumentId]);

  const verify = useCallback(async () => {
    if (!monumentId || !playerId || pending.current) return;
    pending.current = true;
    setState({ status: "checking", message: "Checking your location…" });
    setChecked(null);

    try {
      const result = await getCapturePosition();
      if (!result.ok) {
        setState({ status: result.code, message: result.message });
        return;
      }

      const check = demo.checkEligibility(monumentId, playerId, result.position);
      if (!check.ok) {
        setState({ status: check.code, message: check.message, distanceMeters: check.distanceMeters });
        return;
      }

      setChecked({ position: result.position, simulated: result.simulated });
      setState({
        status: "eligible",
        distanceMeters: check.distanceMeters,
        message: `Location verified. You are about ${check.distanceMeters} m from the monument.`,
      });
    } finally {
      pending.current = false;
    }
  }, [monumentId, playerId]);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
    setChecked(null);
  }, []);

  return { state, verify, reset, checked };
}

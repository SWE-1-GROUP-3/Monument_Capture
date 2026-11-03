import { useCallback, useEffect, useState } from "react";

import { getCapturePosition } from "../../demo/location";
import { demo } from "../../demo/store";
import type { CaptureCheckState, PlayerPosition } from "./types";

const IDLE_STATE: CaptureCheckState = {
  status: "idle",
  message: "Check your location to confirm that you are close enough to begin.",
};

/**
 * Runs the capture checks for one monument: location permission, then GPS
 * accuracy, distance, lock and duplicate checks (see demo/rules.ts).
 * When eligible, `position` holds the fix that was checked so the capture
 * record is created from exactly that position.
 */
export function useCaptureEligibility(monumentId: string | undefined, playerId: string | undefined) {
  const [state, setState] = useState<CaptureCheckState>(IDLE_STATE);
  const [checked, setChecked] = useState<{ position: PlayerPosition; simulated: boolean } | null>(null);

  // A different monument means a fresh check.
  useEffect(() => {
    setState(IDLE_STATE);
    setChecked(null);
  }, [monumentId]);

  const verify = useCallback(async () => {
    if (!monumentId || !playerId) return;
    setState({ status: "checking", message: "Checking your location…" });
    setChecked(null);

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
  }, [monumentId, playerId]);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
    setChecked(null);
  }, []);

  return { state, verify, reset, checked };
}

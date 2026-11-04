import { useCallback, useEffect, useRef, useState } from "react";
import { requestPlayerLocation } from "../location/requestPlayerLocation";
import { isValidCoordinate } from "../utils/mapData";
import type { MapCoordinate } from "../types/mapMonument";

export function usePlayerLocation() {
  const [location, setLocation] = useState<MapCoordinate | null>(null);
  const [message, setMessage] = useState("Location is optional. The legend explains monument availability; blue is your location.");
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const pending = useRef(false);
  const locate = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setMessage("Requesting your location…");
    try {
      const coordinate = await requestPlayerLocation();
      if (!isValidCoordinate(coordinate)) throw new Error("Location unavailable. You can still explore the map.");
      if (mounted.current) {
        setLocation(coordinate);
        setMessage("Your location is shown in blue. The map stays centered on the NYC play area.");
      }
    } catch (error) {
      if (mounted.current) {
        setLocation(null);
        setMessage(error instanceof Error ? error.message : "Location unavailable. You can still explore the map.");
      }
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  const started = useRef(false);
  useEffect(() => {
    mounted.current = true;
    // The ref also prevents duplicate requests during React Strict Mode effect replay.
    if (!started.current) {
      started.current = true;
      void locate();
    }
    return () => { mounted.current = false; };
  }, [locate]);

  return { location, message, loading, locate };
}

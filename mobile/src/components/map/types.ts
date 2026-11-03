import type { MapCoordinate } from "../../types/mapMonument";

export type MonumentMapProps = {
  monuments?: readonly unknown[] | null;
  playerLocation: MapCoordinate | null;
  nowMs: number;
  /** When omitted, popups show no actions (e.g. the small preview maps). */
  onViewDetails?: (monumentId: string) => void;
  /** When provided, "Start Capture" is enabled and calls this; otherwise it stays a disabled placeholder. */
  onStartCapture?: (monumentId: string) => void;
  height?: number;
};

export const NYC_REGION = {
  latitude: 40.751,
  longitude: -73.997,
  latitudeDelta: 0.19,
  longitudeDelta: 0.16,
};

import type { MapCoordinate } from "../../types/mapMonument";

export type MonumentMapProps = {
  monuments?: readonly unknown[] | null;
  playerLocation: MapCoordinate | null;
  /** When provided, popups/callouts offer a "View details" action. */
  onSelect?: (monumentId: string) => void;
  height?: number;
};

export const NYC_REGION = {
  latitude: 40.751,
  longitude: -73.997,
  latitudeDelta: 0.19,
  longitudeDelta: 0.16,
};

export const MARKER_COLORS = {
  free: "#176b47",
  held: "#c2410c",
  mine: "#7c3aed",
  player: "#2563eb",
} as const;

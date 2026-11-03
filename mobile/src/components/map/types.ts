import type { MapCoordinate } from "../../types/mapMonument";

export type MonumentMapProps = {
  monuments?: readonly unknown[] | null;
  playerLocation: MapCoordinate | null;
  nowMs: number;
  onViewDetails: (monumentId: string) => void;
};

export const NYC_REGION = {
  latitude: 40.751,
  longitude: -73.997,
  latitudeDelta: 0.19,
  longitudeDelta: 0.16,
};

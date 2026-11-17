// Derived display data from an approved Capture and its CaptureReview, not Monument columns.
export type MonumentHold = {
  holderDisplayName: string;
  lockExpiresAt: string; // UTC ISO timestamp
  /** True when the signed-in player is the holder (drawn in the "Yours" colour). */
  heldByViewer?: boolean;
};

export type MapMonument = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
  hold: MonumentHold | null;
};

export type MapCoordinate = Pick<MapMonument, "latitude" | "longitude">;

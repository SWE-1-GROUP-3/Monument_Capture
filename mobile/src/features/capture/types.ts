export type CaptureMonument = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
};

export type PlayerPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestampMs: number;
};

export type ProximityEvaluation =
  | { status: "eligible"; distanceMeters: number }
  | { status: "outside"; distanceMeters: number; metersToMoveCloser: number }
  | { status: "inaccurate" }
  | { status: "stale" };

export type CaptureCheckState = {
  status: "idle" | "checking" | "eligible" | "outside" | "inaccurate" | "stale" | "permission-denied" | "unavailable";
  message: string;
  distanceMeters?: number;
};

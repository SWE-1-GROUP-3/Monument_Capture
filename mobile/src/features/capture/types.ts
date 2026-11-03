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
};

export type ProximityEvaluation =
  | { status: "eligible"; distanceMeters: number }
  | { status: "outside"; distanceMeters: number; metersToMoveCloser: number }
  | { status: "inaccurate" };

export type CaptureCheckState = {
  status:
    | "idle"
    | "checking"
    | "eligible"
    | "outside"
    | "inaccurate"
    | "locked"
    | "duplicate"
    | "inactive"
    | "permission-denied"
    | "unavailable";
  message: string;
  distanceMeters?: number;
};

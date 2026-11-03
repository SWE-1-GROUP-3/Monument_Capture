// Data model for the frontend-only demo.
// These mirror the four MVP entities in the design doc so the same shapes can
// later become Supabase/Firebase tables without changing the screens.

export type Role = "player" | "moderator";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Monument = {
  id: string;
  name: string;
  neighborhood: string;
  description: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
  /** Moderators deactivate rather than delete, so capture history stays intact. */
  active: boolean;
};

/** The only entity with a stored lifecycle. */
export type CaptureStatus = "in_progress" | "pending" | "approved" | "rejected";

export type Capture = {
  id: string;
  monumentId: string;
  playerId: string;
  status: CaptureStatus;
  distanceMeters: number;
  accuracyMeters: number;
  /** True when the position came from the demo location simulator. */
  simulatedPosition: boolean;
  /** Data URL (web) or file URI (native). Empty until the photo step. */
  photoUri: string;
  startedAt: number;
  submittedAt: number | null;
};

export type ReviewDecision = "approved" | "rejected";

export type CaptureReview = {
  id: string;
  captureId: string;
  moderatorId: string;
  decision: ReviewDecision;
  reason: string;
  reviewedAt: number;
  /** Set on approval: the monument is locked to the player until this time. */
  lockedUntil: number | null;
};

/** Demo-only settings. Not part of the real data model. */
export type SimulatedLocation =
  | { mode: "real" }
  | { mode: "simulated"; latitude: number; longitude: number; accuracyMeters: number; label: string; monumentId?: string };

export type DemoSettings = {
  /** Milliseconds added to the real clock, so locks can be fast-forwarded in a demo. */
  clockOffsetMs: number;
  location: SimulatedLocation;
};

export type DemoState = {
  version: number;
  users: User[];
  monuments: Monument[];
  captures: Capture[];
  reviews: CaptureReview[];
  sessionUserId: string | null;
  settings: DemoSettings;
};

/** Read-time view of a monument's hold status. Never stored. */
export type MonumentHold =
  | { status: "free" }
  | { status: "held"; holder: User; capture: Capture; review: CaptureReview; lockedUntil: number };

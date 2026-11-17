// Local app data model. These shapes are ready to move behind an API once the
// backend is connected.
// These mirror the four MVP entities in the design doc so the same shapes can
// later become Supabase/Firebase tables without changing the screens.

export type Role = "player" | "moderator";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** When the account was created; shown on the profile. */
  joinedAt?: number;
};

export type Monument = {
  id: string;
  name: string;
  neighborhood: string;
  description: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
  /** Emoji shown on the map pin and in lists. */
  icon?: string;
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

export type DemoState = {
  version: number;
  users: User[];
  monuments: Monument[];
  captures: Capture[];
  reviews: CaptureReview[];
  sessionUserId: string | null;
};

/** Read-time view of a monument's hold status. Never stored. */
export type MonumentHold =
  | { status: "free" }
  | { status: "held"; holder: User; capture: Capture; review: CaptureReview; lockedUntil: number };

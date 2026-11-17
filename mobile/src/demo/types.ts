// Local app data model. These shapes are ready to move behind an API once the
// backend is connected.
// These are frontend view shapes. Backend tables/DTOs are defined separately
// in the schema/API contract; adapters will connect gameplay in steps 5–6.

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
export type CaptureStatus = "pending" | "approved" | "rejected";

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

/** Local-only attempt; never part of submitted capture history. */
export type CaptureDraft = Omit<Capture, "status" | "submittedAt"> & { status: "draft"; submittedAt: null };

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
  drafts: CaptureDraft[];
  reviews: CaptureReview[];
  sessionUserId: string | null;
};

/** Read-time view of a monument's hold status. Never stored. */
export type MonumentHold =
  | { status: "free" }
  | { status: "held"; holder: User; capture: Capture; review: CaptureReview; lockedUntil: number };

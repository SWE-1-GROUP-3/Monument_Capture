// Data model for the frontend-only demo.
// These mirror the four MVP entities in the design doc so the same shapes can
// later become Supabase/Firebase tables without changing the screens.

export type Role = "player" | "moderator";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** When the account was created (seed data); shown on the profile. */
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
  /** "server": a copy of a row from Supabase (replaced on every sync). Absent: created locally. */
  source?: "server";
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
  /** Supabase mode: moderator flags the server recorded at check-in. */
  flags?: string[];
  /** Supabase mode: an in-progress capture must get its photo before this time. */
  expiresAt?: number;
};

export type ReviewDecision = "approved" | "rejected";

export type CaptureReview = {
  /** "server": a copy of a row from Supabase (replaced on every sync). Absent: created locally. */
  source?: "server";
  id: string;
  captureId: string;
  moderatorId: string;
  decision: ReviewDecision;
  reason: string;
  reviewedAt: number;
  /** Set on approval: the monument is locked to the player until this time. */
  lockedUntil: number | null;
  /** Set when a moderator ended the hold early (lockedUntil then equals this time). */
  releasedAt?: number | null;
  releasedBy?: string | null;
  releaseReason?: string | null;
};

/** Demo-only settings. Not part of the real data model. */
export type SimulatedLocation =
  | { mode: "real" }
  /** Demo error cases: behave as if the browser/device refused or failed. */
  | { mode: "denied" }
  | { mode: "unavailable" }
  | { mode: "simulated"; latitude: number; longitude: number; accuracyMeters: number; label: string; monumentId?: string };

/** "real" uses the device camera; the others force an error for the demo. */
export type CameraMode = "real" | "denied" | "missing" | "busy";

export type DemoSettings = {
  /** Milliseconds added to the real clock, so locks can be fast-forwarded in a demo. */
  clockOffsetMs: number;
  location: SimulatedLocation;
  camera: CameraMode;
};

export type DemoState = {
  version: number;
  users: User[];
  monuments: Monument[];
  captures: Capture[];
  reviews: CaptureReview[];
  sessionUserId: string | null;
  /** Supabase mode: database clock minus device clock, measured on each sync. */
  serverClockOffsetMs?: number;
  /** Local unfinished work, retained privately across Supabase account changes. */
  accountDrafts?: Capture[];
  /** Supabase mode: tunables from public.game_settings. */
  serverSettings?: { lockDurationMs: number; maxAccuracyM: number; inProgressTtlMs: number };
  settings: DemoSettings;
};

/** Read-time view of a monument's hold status. Never stored. */
export type MonumentHold =
  | { status: "free" }
  | { status: "held"; holder: User; capture: Capture; review: CaptureReview; lockedUntil: number };

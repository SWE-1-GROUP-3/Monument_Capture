// Data for the capture review flow (US-09, US-10, US-11, US-13, US-14).
// Mirrors the Capture and CaptureReview entities from the design doc.

export type Role = "player" | "moderator";

export type ReviewUser = {
  id: string;
  name: string;
  role: Role;
};

/** Stored lifecycle of a submitted capture. */
export type CaptureStatus = "pending" | "approved" | "rejected";

export type Capture = {
  id: string;
  monumentId: string;
  playerId: string;
  status: CaptureStatus;
  monumentPhotoUri: string;
  /** Distance from the monument reported at check-in (US-05). */
  distanceMeters: number;
  submittedAt: number;
};

export type ReviewDecision = "approved" | "rejected";

/** A moderator's recorded decision (US-14). */
export type CaptureReview = {
  id: string;
  captureId: string;
  moderatorId: string;
  decision: ReviewDecision;
  /** Required for a rejection, optional for an approval. */
  reason: string;
  reviewedAt: number;
};

export type ReviewState = {
  version: number;
  users: ReviewUser[];
  captures: Capture[];
  reviews: CaptureReview[];
  /** Stand-in for the signed-in user until US-01 login is merged. */
  currentUserId: string;
};

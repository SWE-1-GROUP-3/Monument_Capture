// Rules for the capture review flow, as pure functions (easy to test, and the
// part that moves to the backend later).
//   US-09 a submitted capture is Pending Review until a decision is recorded
//   US-10 approval changes the status to Approved
//   US-11 rejection changes it to Rejected and the reason is shown to the player
//   US-13 moderators see a queue of pending captures
//   US-14 moderators approve (no reason needed) or reject (reason required)

import { mapMonuments } from "../data/mapMonuments";
import type { Capture, CaptureReview, CaptureStatus, ReviewDecision, ReviewState, ReviewUser } from "./types";

export const MIN_REASON_LENGTH = 3;

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

export const STATUS_LABEL: Record<CaptureStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function findUser(state: ReviewState, id: string | undefined): ReviewUser | undefined {
  return id ? state.users.find((u) => u.id === id) : undefined;
}

export function findCapture(state: ReviewState, id: string | undefined): Capture | undefined {
  return id ? state.captures.find((c) => c.id === id) : undefined;
}

export function monumentName(monumentId: string): string {
  return mapMonuments.find((m) => m.id === monumentId)?.name ?? "Unknown monument";
}

export function reviewFor(state: ReviewState, captureId: string): CaptureReview | undefined {
  return state.reviews.find((r) => r.captureId === captureId);
}

export function isModerator(state: ReviewState, userId: string | undefined) {
  return findUser(state, userId)?.role === "moderator";
}

// ---------- US-09: submission ----------

/**
 * Records a completed capture as Pending Review. If anything required is
 * missing the submission fails, nothing is stored, and the error explains why.
 */
export function submitCapture(
  state: ReviewState,
  input: { monumentId: string; playerId: string; monumentPhotoUri: string; distanceMeters: number },
  now: number,
): { state: ReviewState; capture: Capture } {
  const player = findUser(state, input.playerId);
  if (!player || player.role !== "player") throw new ReviewError("Your submission was not received: only players can submit captures.");
  if (!mapMonuments.some((m) => m.id === input.monumentId)) throw new ReviewError("Your submission was not received: the monument could not be found.");
  if (!input.monumentPhotoUri) throw new ReviewError("Your submission was not received: the monument photo is missing. Please try again.");
  const capture: Capture = { id: newId("c"), status: "pending", submittedAt: now, ...input };
  return { state: { ...state, captures: [...state.captures, capture] }, capture };
}

// ---------- US-09/10/11: what the player sees ----------

export function getCapturesFor(state: ReviewState, playerId: string) {
  return state.captures
    .filter((c) => c.playerId === playerId)
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .map((capture) => ({ capture, review: reviewFor(state, capture.id) }));
}

// ---------- US-13: moderation queue ----------

export function getPendingQueue(state: ReviewState) {
  return state.captures
    .filter((c) => c.status === "pending")
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .map((capture) => ({ capture, player: findUser(state, capture.playerId) }));
}

// ---------- US-14: decisions ----------

export function reviewCapture(
  state: ReviewState,
  input: { captureId: string; moderatorId: string; decision: ReviewDecision; reason: string },
  now: number,
): ReviewState {
  if (!isModerator(state, input.moderatorId)) throw new ReviewError("Only moderators can approve or reject captures.");
  const capture = findCapture(state, input.captureId);
  if (!capture) throw new ReviewError("Capture not found.");
  if (capture.status !== "pending") throw new ReviewError("This capture has already been reviewed.");

  const reason = input.reason.trim();
  if (input.decision === "rejected" && reason.length < MIN_REASON_LENGTH) {
    throw new ReviewError("A reason is required to reject a capture.");
  }

  const review: CaptureReview = {
    id: newId("r"),
    captureId: capture.id,
    moderatorId: input.moderatorId,
    decision: input.decision,
    reason,
    reviewedAt: now,
  };
  return {
    ...state,
    captures: state.captures.map((c) => (c.id === capture.id ? { ...c, status: input.decision } : c)),
    reviews: [...state.reviews, review],
  };
}

export function formatTimeAgo(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

// All game rules for the demo, as pure functions over DemoState.
// Nothing here touches React, storage or the device, so it is easy to test and
// it is the part that moves to the backend (Supabase/Firebase functions) later.

import { evaluateCaptureProximity } from "../features/capture/proximity";
import type { PlayerPosition } from "../features/capture/types";
import type {
  Capture,
  CaptureReview,
  DemoState,
  Monument,
  MonumentHold,
  ReviewDecision,
  User,
} from "./types";

/** How long an approved capture locks the monument to its player. */
export const LOCK_DURATION_MS = 60 * 60_000;
export const MIN_REASON_LENGTH = 3;

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- Lookups ----------

export function findUser(state: DemoState, id: string | null | undefined): User | undefined {
  return id ? state.users.find((u) => u.id === id) : undefined;
}

export function findMonument(state: DemoState, id: string | null | undefined): Monument | undefined {
  return id ? state.monuments.find((x) => x.id === id) : undefined;
}

export function findCapture(state: DemoState, id: string | null | undefined): Capture | undefined {
  return id ? state.captures.find((c) => c.id === id) : undefined;
}

export function reviewFor(state: DemoState, captureId: string): CaptureReview | undefined {
  return state.reviews.find((r) => r.captureId === captureId);
}

// ---------- Hold status (derived at read time, never stored) ----------

export function getHold(state: DemoState, monumentId: string, now: number): MonumentHold {
  let best: MonumentHold = { status: "free" };
  for (const review of state.reviews) {
    if (review.decision !== "approved" || review.lockedUntil === null || review.lockedUntil <= now) continue;
    const capture = findCapture(state, review.captureId);
    if (!capture || capture.monumentId !== monumentId) continue;
    const holder = findUser(state, capture.playerId);
    if (!holder) continue;
    if (best.status === "free" || review.lockedUntil > best.lockedUntil) {
      best = { status: "held", holder, capture, review, lockedUntil: review.lockedUntil };
    }
  }
  return best;
}

export function getHoldingsFor(state: DemoState, playerId: string, now: number) {
  return state.monuments
    .map((monument) => ({ monument, hold: getHold(state, monument.id, now) }))
    .filter((x): x is { monument: Monument; hold: Extract<MonumentHold, { status: "held" }> } =>
      x.hold.status === "held" && x.hold.holder.id === playerId);
}

export function getHistoryFor(state: DemoState, playerId: string) {
  return state.captures
    .filter((c) => c.playerId === playerId && c.status !== "in_progress")
    .sort((a, b) => (b.submittedAt ?? b.startedAt) - (a.submittedAt ?? a.startedAt))
    .map((capture) => ({
      capture,
      monument: findMonument(state, capture.monumentId),
      review: reviewFor(state, capture.id),
    }));
}

export function getPendingQueue(state: DemoState) {
  return state.captures
    .filter((c) => c.status === "pending")
    .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
    .map((capture) => ({
      capture,
      monument: findMonument(state, capture.monumentId),
      player: findUser(state, capture.playerId),
    }));
}

export function getPlayerStats(state: DemoState, playerId: string, now: number) {
  const mine = state.captures.filter((c) => c.playerId === playerId);
  return {
    holding: getHoldingsFor(state, playerId, now).length,
    pending: mine.filter((c) => c.status === "pending").length,
    approved: mine.filter((c) => c.status === "approved").length,
    rejected: mine.filter((c) => c.status === "rejected").length,
  };
}

// ---------- Capture flow ----------

export type CaptureCheck =
  | { ok: true; distanceMeters: number }
  | { ok: false; code: "inactive" | "inaccurate" | "outside" | "locked" | "duplicate"; message: string; distanceMeters?: number };

/**
 * The capture checks, cheapest first: GPS accuracy, distance to the monument,
 * then whether the monument is locked. A capture record is only created when
 * all of them pass.
 */
export function checkCaptureEligibility(
  state: DemoState,
  monumentId: string,
  playerId: string,
  position: PlayerPosition,
  now: number,
): CaptureCheck {
  const monument = findMonument(state, monumentId);
  if (!monument || !monument.active) {
    return { ok: false, code: "inactive", message: "This monument is not available for capture." };
  }

  const proximity = evaluateCaptureProximity(monument, position);
  if (proximity.status === "inaccurate") {
    return {
      ok: false,
      code: "inaccurate",
      message: "Your GPS signal is not accurate enough (needs 50 m or better). Move to an open area and retry.",
    };
  }
  if (proximity.status === "outside") {
    return {
      ok: false,
      code: "outside",
      distanceMeters: proximity.distanceMeters,
      message: `You are about ${formatDistance(proximity.distanceMeters)} away. Move ${formatDistance(proximity.metersToMoveCloser)} closer and retry.`,
    };
  }

  const hold = getHold(state, monumentId, now);
  if (hold.status === "held") {
    const who = hold.holder.id === playerId ? "you" : hold.holder.name;
    return {
      ok: false,
      code: "locked",
      distanceMeters: proximity.distanceMeters,
      message: `Held by ${who} for another ${formatRemaining(hold.lockedUntil - now)}. Come back when the lock expires.`,
    };
  }

  const alreadyPending = state.captures.some(
    (c) => c.monumentId === monumentId && c.playerId === playerId && c.status === "pending",
  );
  if (alreadyPending) {
    return {
      ok: false,
      code: "duplicate",
      distanceMeters: proximity.distanceMeters,
      message: "You already have a capture of this monument waiting for review.",
    };
  }

  return { ok: true, distanceMeters: proximity.distanceMeters };
}

export function startCapture(
  state: DemoState,
  input: { monumentId: string; playerId: string; position: PlayerPosition; simulated: boolean },
  now: number,
): { state: DemoState; capture: Capture } {
  const check = checkCaptureEligibility(state, input.monumentId, input.playerId, input.position, now);
  if (!check.ok) throw new RuleError(check.message);

  // A player has at most one capture in progress; starting another replaces it.
  const captures = state.captures.filter((c) => !(c.playerId === input.playerId && c.status === "in_progress"));
  const capture: Capture = {
    id: newId("c"),
    monumentId: input.monumentId,
    playerId: input.playerId,
    status: "in_progress",
    distanceMeters: check.distanceMeters,
    accuracyMeters: Math.round(input.position.accuracyMeters ?? 0),
    simulatedPosition: input.simulated,
    photoUri: "",
    startedAt: now,
    submittedAt: null,
  };
  return { state: { ...state, captures: [...captures, capture] }, capture };
}

export function submitCapturePhoto(state: DemoState, captureId: string, photoUri: string, now: number): DemoState {
  const capture = findCapture(state, captureId);
  if (!capture || capture.status !== "in_progress") throw new RuleError("This capture is no longer in progress.");
  if (!photoUri) throw new RuleError("Add a photo of the monument before submitting.");
  return updateCapture(state, captureId, { status: "pending", photoUri, submittedAt: now });
}

export function cancelCapture(state: DemoState, captureId: string): DemoState {
  const capture = findCapture(state, captureId);
  if (!capture || capture.status !== "in_progress") return state;
  return { ...state, captures: state.captures.filter((c) => c.id !== captureId) };
}

export function getInProgressCapture(state: DemoState, playerId: string) {
  return state.captures.find((c) => c.playerId === playerId && c.status === "in_progress");
}

// ---------- Moderation ----------

/**
 * Records a moderator decision. Approval locks the monument to the player.
 *
 * Concurrency: approval re-checks the lock before writing, so two approvals on
 * the same monument can only ever produce one holder. In this demo every update
 * is synchronous, so the check-then-write cannot interleave. In the real
 * backend this check must be a database constraint or transaction.
 */
export function reviewCapture(
  state: DemoState,
  input: { captureId: string; moderatorId: string; decision: ReviewDecision; reason: string },
  now: number,
): DemoState {
  const moderator = findUser(state, input.moderatorId);
  if (!moderator || moderator.role !== "moderator") throw new RuleError("Only moderators can review captures.");

  const capture = findCapture(state, input.captureId);
  if (!capture) throw new RuleError("Capture not found.");
  if (capture.status !== "pending") throw new RuleError("This capture has already been reviewed.");

  // US-14: a rejection must carry a reason the player can act on; approval needs none.
  const reason = input.reason.trim();
  if (input.decision === "rejected" && reason.length < MIN_REASON_LENGTH) {
    throw new RuleError("A reason is required to reject a capture.");
  }

  if (input.decision === "approved") {
    const hold = getHold(state, capture.monumentId, now);
    if (hold.status === "held") {
      throw new RuleError(
        `This monument is already held by ${hold.holder.name} for another ${formatRemaining(hold.lockedUntil - now)}. Reject this capture instead.`,
      );
    }
  }

  const review: CaptureReview = {
    id: newId("r"),
    captureId: capture.id,
    moderatorId: moderator.id,
    decision: input.decision,
    reason,
    reviewedAt: now,
    lockedUntil: input.decision === "approved" ? now + LOCK_DURATION_MS : null,
  };
  return {
    ...updateCapture(state, capture.id, { status: input.decision }),
    reviews: [...state.reviews, review],
  };
}

// ---------- Monument management ----------

export type MonumentInput = Omit<Monument, "id" | "active"> & { id?: string };

export function validateMonument(input: MonumentInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) return "Latitude must be between -90 and 90.";
  if (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180) return "Longitude must be between -180 and 180.";
  if (!Number.isFinite(input.captureRadiusMeters) || input.captureRadiusMeters < 10 || input.captureRadiusMeters > 500) {
    return "Capture radius must be between 10 and 500 meters.";
  }
  return null;
}

export function saveMonument(state: DemoState, input: MonumentInput): { state: DemoState; monument: Monument } {
  const error = validateMonument(input);
  if (error) throw new RuleError(error);
  const clean = {
    name: input.name.trim(),
    neighborhood: input.neighborhood.trim(),
    description: input.description.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    captureRadiusMeters: Math.round(input.captureRadiusMeters),
  };
  const existing = findMonument(state, input.id);
  if (existing) {
    const monument = { ...existing, ...clean };
    return { state: { ...state, monuments: state.monuments.map((x) => (x.id === existing.id ? monument : x)) }, monument };
  }
  const monument: Monument = { id: newId("m"), active: true, ...clean };
  return { state: { ...state, monuments: [...state.monuments, monument] }, monument };
}

export function setMonumentActive(state: DemoState, monumentId: string, active: boolean): DemoState {
  return { ...state, monuments: state.monuments.map((x) => (x.id === monumentId ? { ...x, active } : x)) };
}

// ---------- Formatting helpers ----------

export function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function formatRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatTimeAgo(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

function updateCapture(state: DemoState, captureId: string, patch: Partial<Capture>): DemoState {
  return { ...state, captures: state.captures.map((c) => (c.id === captureId ? { ...c, ...patch } : c)) };
}

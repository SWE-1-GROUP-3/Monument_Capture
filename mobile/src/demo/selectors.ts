// Read-only selectors for the map-first UI: level, records, badges, range.
// Nothing here changes state; the game rules stay in rules.ts.

import { distanceInMeters } from "../features/capture/proximity";
import { findMonument, getHold, getPlayerStats, reviewFor } from "./rules";
import type { Capture, CaptureReview, DemoState, Monument, User } from "./types";

type LatLng = { latitude: number; longitude: number };

// ---------- Position and range ----------

export type EffectivePosition = LatLng & { simulated: boolean; label: string };

/**
 * Where the player is for the UI: the Demo tools override when set, otherwise
 * the real device fix (if one was granted).
 */
export function getEffectivePosition(state: DemoState, realLocation: LatLng | null | undefined): EffectivePosition | null {
  const loc = state.settings.location;
  if (loc.mode === "simulated") return { latitude: loc.latitude, longitude: loc.longitude, simulated: true, label: loc.label };
  if (loc.mode === "real" && realLocation) return { ...realLocation, simulated: false, label: "Live GPS" };
  return null;
}

/** Human label for the profile's Location row. */
export function getLocationLabel(state: DemoState): string {
  const loc = state.settings.location;
  if (loc.mode === "simulated") {
    const m = findMonument(state, loc.monumentId);
    return m ? `Simulated: ${m.name}` : `Simulated: ${loc.label.replace(/^at /, "")}`;
  }
  if (loc.mode === "denied") return "Simulated: permission denied";
  if (loc.mode === "unavailable") return "Simulated: GPS unavailable";
  return "Live GPS";
}

export function distanceTo(position: LatLng, monument: Monument): number {
  return Math.round(distanceInMeters(position, monument));
}

export function getNearestMonument(state: DemoState, position: LatLng | null) {
  if (!position) return null;
  let best: { monument: Monument; distanceMeters: number } | null = null;
  for (const monument of state.monuments) {
    if (!monument.active) continue;
    const d = distanceTo(position, monument);
    if (!best || d < best.distanceMeters) best = { monument, distanceMeters: d };
  }
  return best;
}

/** Active monuments whose capture radius contains the position. */
export function getMonumentsInRange(state: DemoState, position: LatLng | null): Monument[] {
  if (!position) return [];
  return state.monuments.filter((m) => m.active && distanceTo(position, m) <= m.captureRadiusMeters);
}

/** Area shown in the status pill: the neighbourhood of the nearest monument. */
export function getAreaName(state: DemoState, position: LatLng | null): string {
  return getNearestMonument(state, position)?.monument.neighborhood ?? "New York City";
}

/**
 * Radius of the capture ring drawn around the player: the capture radius of
 * the nearest monument, since that is the one the player would capture.
 */
export function getCaptureRingRadius(state: DemoState, position: LatLng | null): number | null {
  return getNearestMonument(state, position)?.monument.captureRadiusMeters ?? null;
}

// ---------- Identity ----------

export function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]?.[0], parts[parts.length - 1]?.[0]] : [parts[0]?.[0], parts[0]?.[1]];
  return letters.filter(Boolean).join("").toUpperCase() || "?";
}

export function monumentIcon(monument: Monument | undefined): string {
  return monument?.icon || "📍";
}

/** Player level. Change the formula here only. */
export function getPlayerLevel(state: DemoState, playerId: string): number {
  const approved = state.captures.filter((c) => c.playerId === playerId && c.status === "approved").length;
  return 1 + Math.floor(approved / 2);
}

export function getProfileSummary(state: DemoState, user: User, now: number) {
  const stats = getPlayerStats(state, user.id, now);
  return {
    level: getPlayerLevel(state, user.id),
    initials: getInitials(user.name),
    holding: stats.holding,
    captures: stats.approved,
    pending: stats.pending,
    joinedAt: user.joinedAt ?? null,
  };
}

// ---------- Holds and records ----------

export type HoldInterval = {
  captureId: string;
  monumentId: string;
  start: number;
  /** Expiry, takeover, or `now` while still held. */
  end: number;
  active: boolean;
};

type Approval = { capture: Capture; review: CaptureReview };

function approvalsFor(state: DemoState, monumentId: string): Approval[] {
  return state.captures
    .filter((c) => c.monumentId === monumentId && c.status === "approved")
    .map((capture) => ({ capture, review: reviewFor(state, capture.id) }))
    .filter((a): a is Approval => !!a.review && a.review.decision === "approved")
    .sort((a, b) => a.review.reviewedAt - b.review.reviewedAt);
}

/**
 * Every hold a player has had: from the approval until the lock expired, the
 * monument was taken over by a later approval, or now if it is still held.
 */
export function getHoldIntervals(state: DemoState, playerId: string, now: number, monumentId?: string): HoldInterval[] {
  const ids = monumentId ? [monumentId] : [...new Set(state.captures.map((c) => c.monumentId))];
  const out: HoldInterval[] = [];
  for (const id of ids) {
    const approvals = approvalsFor(state, id).filter((a) => a.review.reviewedAt <= now);
    approvals.forEach((a, i) => {
      if (a.capture.playerId !== playerId) return;
      const start = a.review.reviewedAt;
      const expiry = a.review.lockedUntil ?? start;
      const takeover = approvals[i + 1]?.review.reviewedAt ?? Infinity;
      const end = Math.min(expiry, takeover, now);
      out.push({ captureId: a.capture.id, monumentId: id, start, end, active: end === now && expiry > now && takeover > now });
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Longest run of this player's consecutive locks on one monument. */
function longestStreak(state: DemoState, playerId: string, monumentId: string, now: number): number {
  let best = 0;
  let run = 0;
  for (const a of approvalsFor(state, monumentId)) {
    if (a.review.reviewedAt > now) continue;
    run = a.capture.playerId === playerId ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export type MonumentRecord = {
  monument: Monument;
  holds: number;
  totalHeldMs: number;
  longestHoldMs: number;
  attempts: number;
  approved: number;
  approvalRate: number;
  firstCapturedAt: number | null;
  lastHeldAt: number | null;
  holdingNow: boolean;
  streak: number;
  badges: string[];
};

/**
 * All-time record for every monument the player has ever submitted a capture
 * for, with badges. Badge rules:
 *   👑 Most held      the monument with the most holds (ties: more hold time)
 *   🥇 First capture  the monument of the player's first-ever approved capture
 *   🔥 N in a row     N ≥ 2 consecutive locks on the monument by this player
 *   ⏱️ Full lock      a hold that lasted the whole lock without being taken
 *   🎯 Perfect aim    every attempt approved, with at least 2 attempts
 */
export function getPlayerRecords(state: DemoState, playerId: string, now: number, lockDurationMs: number): MonumentRecord[] {
  const submitted = state.captures.filter((c) => c.playerId === playerId && c.status !== "in_progress");
  const monumentIds = [...new Set(submitted.map((c) => c.monumentId))];
  const intervals = getHoldIntervals(state, playerId, now);

  const records: MonumentRecord[] = monumentIds.flatMap((id) => {
    const monument = findMonument(state, id);
    if (!monument) return [];
    const holds = intervals.filter((h) => h.monumentId === id);
    const tries = submitted.filter((c) => c.monumentId === id);
    const approved = tries.filter((c) => c.status === "approved").length;
    const durations = holds.map((h) => h.end - h.start);
    return [{
      monument,
      holds: holds.length,
      totalHeldMs: durations.reduce((s, d) => s + d, 0),
      longestHoldMs: durations.length ? Math.max(...durations) : 0,
      attempts: tries.length,
      approved,
      approvalRate: tries.length ? approved / tries.length : 0,
      firstCapturedAt: holds[0]?.start ?? null,
      lastHeldAt: holds.length ? holds[holds.length - 1]!.start : null,
      holdingNow: holds.some((h) => h.active),
      streak: longestStreak(state, playerId, id, now),
      badges: [],
    }];
  });

  // Badges.
  const top = [...records].filter((r) => r.holds > 0).sort((a, b) => b.holds - a.holds || b.totalHeldMs - a.totalHeldMs)[0];
  const first = intervals[0];
  for (const r of records) {
    if (top && r.monument.id === top.monument.id) r.badges.push("👑 Most held");
    if (first && r.monument.id === first.monumentId) r.badges.push("🥇 First capture");
    if (r.streak >= 2) r.badges.push(`🔥 ${r.streak} in a row`);
    if (r.longestHoldMs >= lockDurationMs) r.badges.push("⏱️ Full lock");
    if (r.attempts >= 2 && r.approved === r.attempts) r.badges.push("🎯 Perfect aim");
  }
  return records;
}

export type RecordSort = "holds" | "time" | "recent";

export function sortRecords(records: MonumentRecord[], by: RecordSort): MonumentRecord[] {
  const copy = [...records];
  if (by === "holds") copy.sort((a, b) => b.holds - a.holds || b.totalHeldMs - a.totalHeldMs);
  if (by === "time") copy.sort((a, b) => b.totalHeldMs - a.totalHeldMs || b.holds - a.holds);
  if (by === "recent") copy.sort((a, b) => (b.lastHeldAt ?? -1) - (a.lastHeldAt ?? -1));
  return copy;
}

/** Header tiles on the Records sheet. */
export function getRecordTotals(state: DemoState, playerId: string, now: number) {
  const submitted = state.captures.filter((c) => c.playerId === playerId && c.status !== "in_progress");
  const approved = submitted.filter((c) => c.status === "approved").length;
  const intervals = getHoldIntervals(state, playerId, now);
  return {
    timesHeld: intervals.length,
    totalHeldMs: intervals.reduce((s, h) => s + (h.end - h.start), 0),
    approved,
    submitted: submitted.length,
    approvalRate: submitted.length ? approved / submitted.length : 0,
  };
}

/** The player's own capture of this monument that is waiting for review, if any. */
export function getPendingCaptureFor(state: DemoState, playerId: string, monumentId: string): Capture | undefined {
  return state.captures.find((c) => c.playerId === playerId && c.monumentId === monumentId && c.status === "pending");
}

/** "Held 3× · 6h 05m total" or "Never held", for the monument sheet. */
export function getRecordLine(state: DemoState, playerId: string, monumentId: string, now: number): string {
  const holds = getHoldIntervals(state, playerId, now, monumentId);
  if (holds.length === 0) return "Never held";
  const total = holds.reduce((s, h) => s + (h.end - h.start), 0);
  return `Held ${holds.length}× · ${formatDuration(total)} total`;
}

/** Holder text for the monument sheet: a name, "You" or "Nobody". */
export function getHolderLabel(state: DemoState, monumentId: string, viewerId: string | undefined, now: number): string {
  const hold = getHold(state, monumentId, now);
  if (hold.status === "free") return "Nobody";
  return hold.holder.id === viewerId ? "You" : hold.holder.name;
}


// ---------- Formatting ----------

/** 6h 05m, or 38m. */
export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m` : `${mins}m`;
}

/** Today, Yesterday, or "Oct 29". */
export function formatDay(ts: number | null, now: number): string {
  if (ts === null) return "—";
  const d = new Date(ts);
  const today = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthYear(ts: number | null): string {
  return ts === null ? "recently" : new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

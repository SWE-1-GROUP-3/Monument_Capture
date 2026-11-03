import type { MapMonument } from "../types/mapMonument";

export type MonumentAvailability =
  | { status: "available" }
  | { status: "locked"; holderDisplayName: string; remainingMs: number }
  | { status: "unknown" };

// Device time is sufficient for this prototype; backend availability will use server time.
export function getMonumentAvailability(monument: MapMonument, nowMs: number): MonumentAvailability {
  if (!Number.isFinite(nowMs)) return { status: "unknown" };
  if (monument.hold === null) return { status: "available" };

  const expiresAtMs = Date.parse(monument.hold.lockExpiresAt);
  if (!Number.isFinite(expiresAtMs)) return { status: "unknown" };

  const remainingMs = expiresAtMs - nowMs;
  if (remainingMs <= 0) return { status: "available" };

  return { status: "locked", holderDisplayName: monument.hold.holderDisplayName, remainingMs };
}

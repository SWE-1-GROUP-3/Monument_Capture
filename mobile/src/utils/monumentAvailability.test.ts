import { describe, expect, it } from "vitest";
import type { MapMonument } from "../types/mapMonument";
import { getMonumentAvailability } from "./monumentAvailability";

const nowMs = Date.parse("2026-11-03T15:00:00.000Z");
const monument: MapMonument = {
  id: "test", name: "Test monument", latitude: 40, longitude: -74, captureRadiusMeters: 100, hold: null,
};
const held: MapMonument = {
  ...monument,
  hold: { holderDisplayName: "Demo Player A", lockExpiresAt: new Date(nowMs + 3 * 60 * 60_000).toISOString() },
};

describe("monument availability", () => {
  it("returns available without holder or time when no hold exists", () => {
    expect(getMonumentAvailability(monument, nowMs)).toEqual({ status: "available" });
  });

  it("returns the holder and remaining time for an active lock", () => {
    expect(getMonumentAvailability(held, nowMs)).toEqual({
      status: "locked", holderDisplayName: "Demo Player A", remainingMs: 10_800_000,
    });
  });

  it.each([
    [-1, { status: "locked", holderDisplayName: "Demo Player A", remainingMs: 1 }],
    [0, { status: "available" }],
    [1, { status: "available" }],
  ])("handles expiration boundary offset %i ms", (offset, expected) => {
    const expiration = Date.parse(held.hold!.lockExpiresAt);
    expect(getMonumentAvailability(held, expiration + offset)).toEqual(expected);
  });

  it("hides expired hold information without changing the stored record", () => {
    const hold = Object.freeze({ holderDisplayName: "Demo Player B", lockExpiresAt: new Date(nowMs - 5 * 60_000).toISOString() });
    const expired = Object.freeze({ ...monument, hold });
    expect(getMonumentAvailability(expired, nowMs)).toEqual({ status: "available" });
    expect(expired.hold).toBe(hold);
    expect(expired.hold.holderDisplayName).toBe("Demo Player B");
    expect(expired.hold.lockExpiresAt).toBe("2026-11-03T14:55:00.000Z");
  });

  it.each(["", "not-a-timestamp"])("returns unknown for invalid expiration %j", (lockExpiresAt) => {
    expect(getMonumentAvailability({ ...held, hold: { ...held.hold!, lockExpiresAt } }, nowMs))
      .toEqual({ status: "unknown" });
  });

  it.each([NaN, Infinity, -Infinity])("returns unknown for non-finite nowMs %s, with or without a hold", (invalidNow) => {
    expect(getMonumentAvailability(monument, invalidNow)).toEqual({ status: "unknown" });
    expect(getMonumentAvailability(held, invalidNow)).toEqual({ status: "unknown" });
  });
});

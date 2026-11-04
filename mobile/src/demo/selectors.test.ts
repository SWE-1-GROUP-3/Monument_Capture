import { describe, expect, it } from "vitest";

import { LOCK_DURATION_MS, reviewCapture, startCapture, submitCapturePhoto } from "./rules";
import { createSeedState } from "./seed";
import {
  formatDuration,
  getAreaName,
  getCaptureRingRadius,
  getEffectivePosition,
  getHoldIntervals,
  getHolderLabel,
  getInitials,
  getLocationLabel,
  getMonumentsInRange,
  getPlayerLevel,
  getPlayerRecords,
  getRecordLine,
  getRecordTotals,
  sortRecords,
} from "./selectors";
import type { DemoState } from "./types";

const NOW = Date.UTC(2026, 10, 3, 17, 0, 0);
const HOUR = 3_600_000;
const records = (state: DemoState = createSeedState(NOW)) => getPlayerRecords(state, "u-alex", NOW, LOCK_DURATION_MS);
const rec = (id: string, state?: DemoState) => records(state).find((r) => r.monument.id === id)!;

describe("position and range", () => {
  it("uses the demo override, else the real fix, else nothing", () => {
    const state = createSeedState(NOW);
    expect(getEffectivePosition(state, null)).toBeNull();
    expect(getEffectivePosition(state, { latitude: 1, longitude: 2 })).toMatchObject({ simulated: false, label: "Live GPS" });
    state.settings.location = { mode: "simulated", latitude: 40.7, longitude: -74, accuracyMeters: 8, label: "at X" };
    expect(getEffectivePosition(state, { latitude: 1, longitude: 2 })).toMatchObject({ latitude: 40.7, simulated: true });
    state.settings.location = { mode: "denied" };
    expect(getEffectivePosition(state, { latitude: 1, longitude: 2 })).toBeNull();
    expect(getLocationLabel(state)).toBe("Simulated: permission denied");
  });

  it("counts monuments in range using each monument's capture radius", () => {
    const state = createSeedState(NOW);
    const atArch = { latitude: 40.7312 + 12 / 111_320, longitude: -73.9971 };
    expect(getMonumentsInRange(state, atArch).map((m) => m.id)).toEqual(["washington-arch"]);
    expect(getMonumentsInRange(state, { latitude: 40.758, longitude: -73.9855 })).toEqual([]);
    expect(getMonumentsInRange(state, null)).toEqual([]);
    expect(getAreaName(state, atArch)).toBe("Greenwich Village");
    expect(getAreaName(state, null)).toBe("New York City");
    expect(getCaptureRingRadius(state, atArch)).toBe(100);
  });
});

describe("identity and level", () => {
  it("makes initials", () => {
    expect(getInitials("Alex Rivera")).toBe("AR");
    expect(getInitials("Morgan")).toBe("MO");
    expect(getInitials(undefined)).toBe("?");
  });

  it("level is 1 + floor(approved captures / 2)", () => {
    expect(getPlayerLevel(createSeedState(NOW), "u-alex")).toBe(4); // 7 approved
    expect(getPlayerLevel(createSeedState(NOW), "u-demo")).toBe(1); // none
  });
});

describe("hold intervals", () => {
  it("runs from approval to expiry, and up to now while still held", () => {
    const liberty = getHoldIntervals(createSeedState(NOW), "u-alex", NOW, "liberty");
    expect(liberty).toHaveLength(3);
    expect(liberty[0]!.end - liberty[0]!.start).toBe(LOCK_DURATION_MS);
    const current = liberty[2]!;
    expect(current.active).toBe(true);
    expect(current.end).toBe(NOW);
    expect(NOW - current.start).toBe(40 * 60_000);
  });

  it("ends a hold early when the monument is taken over", () => {
    const state = createSeedState(NOW);
    const arch = state.reviews.find((r) => state.captures.find((c) => c.id === r.captureId)?.monumentId === "washington-arch"
      && state.captures.find((c) => c.id === r.captureId)?.playerId === "u-alex")!;
    // Pretend Sam's approval happened 20 minutes into Alex's lock.
    const sam = state.reviews.find((r) => state.captures.find((c) => c.id === r.captureId)?.playerId === "u-sam"
      && state.captures.find((c) => c.id === r.captureId)?.monumentId === "washington-arch")!;
    sam.reviewedAt = arch.reviewedAt + 20 * 60_000;
    const [hold] = getHoldIntervals(state, "u-alex", NOW, "washington-arch");
    expect(hold!.end - hold!.start).toBe(20 * 60_000);
  });
});

describe("records", () => {
  it("lists every monument the player attempted, held or not", () => {
    expect(records().map((r) => r.monument.id).sort()).toEqual(
      ["alice", "brooklyn-war", "charging-bull", "flatiron-worth", "liberty", "washington-arch"],
    );
  });

  it("derives counts, times and approval for one monument", () => {
    const bull = rec("charging-bull");
    expect(bull).toMatchObject({ holds: 1, attempts: 2, approved: 1, approvalRate: 0.5, holdingNow: false });
    expect(bull.totalHeldMs).toBe(LOCK_DURATION_MS);
    const liberty = rec("liberty");
    expect(liberty).toMatchObject({ holds: 3, holdingNow: true, streak: 3 });
    expect(liberty.totalHeldMs).toBe(2 * HOUR + 40 * 60_000);
  });

  it("awards badges by rule", () => {
    expect(rec("liberty").badges).toEqual(["👑 Most held", "🔥 3 in a row", "⏱️ Full lock", "🎯 Perfect aim"]);
    expect(rec("charging-bull").badges).toEqual(["🥇 First capture", "⏱️ Full lock"]);
    expect(rec("alice").badges).toContain("🔥 2 in a row");
    expect(rec("flatiron-worth").badges).toEqual([]);
  });

  it("sorts by most held, longest held and most recent", () => {
    expect(sortRecords(records(), "holds")[0]!.monument.id).toBe("liberty");
    expect(sortRecords(records(), "time")[0]!.monument.id).toBe("liberty");
    expect(sortRecords(records(), "recent")[0]!.monument.id).toBe("liberty");
    expect(sortRecords(records(), "recent").at(-1)!.holds).toBe(0);
  });

  it("totals: times held, hold time and approval rate", () => {
    const t = getRecordTotals(createSeedState(NOW), "u-alex", NOW);
    expect(t).toMatchObject({ timesHeld: 7, approved: 7, submitted: 10, approvalRate: 0.7 });
    expect(getRecordTotals(createSeedState(NOW), "u-demo", NOW)).toMatchObject({ timesHeld: 0, submitted: 0, approvalRate: 0 });
  });

  it("a newly approved capture shows up in records", () => {
    let state = createSeedState(NOW);
    const at = { latitude: 40.7056, longitude: -74.0134, accuracyMeters: 5 };
    const started = startCapture(state, { monumentId: "farragut", playerId: "u-alex", position: { ...at, latitude: 40.7426, longitude: -73.9878 }, simulated: true }, NOW);
    state = submitCapturePhoto(started.state, started.capture.id, "data:x", NOW);
    expect(rec("farragut", state)).toMatchObject({ holds: 0, attempts: 1 });
    state = reviewCapture(state, { captureId: started.capture.id, moderatorId: "u-morgan", decision: "approved", reason: "" }, NOW);
    expect(rec("farragut", state)).toMatchObject({ holds: 1, approved: 1, holdingNow: true });
    const later = getPlayerRecords(state, "u-alex", NOW + 30 * 60_000, LOCK_DURATION_MS).find((r) => r.monument.id === "farragut")!;
    expect(later.totalHeldMs).toBe(30 * 60_000); // current hold counts up to now
    const expired = getPlayerRecords(state, "u-alex", NOW + 2 * HOUR, LOCK_DURATION_MS).find((r) => r.monument.id === "farragut")!;
    expect(expired).toMatchObject({ holdingNow: false, totalHeldMs: LOCK_DURATION_MS });
  });
});

describe("monument sheet lines", () => {
  it("record line and holder label", () => {
    const state = createSeedState(NOW);
    expect(getRecordLine(state, "u-alex", "liberty", NOW)).toBe("Held 3× · 2h 40m total");
    expect(getRecordLine(state, "u-alex", "grant", NOW)).toBe("Never held");
    expect(getHolderLabel(state, "liberty", "u-alex", NOW)).toBe("You");
    expect(getHolderLabel(state, "bethesda", "u-alex", NOW)).toBe("Sam Chen");
    expect(getHolderLabel(state, "grant", "u-alex", NOW)).toBe("Nobody");
  });

  it("formats durations", () => {
    expect(formatDuration(6 * HOUR + 5 * 60_000)).toBe("6h 05m");
    expect(formatDuration(38 * 60_000)).toBe("38m");
  });
});

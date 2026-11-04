import { describe, expect, it } from "vitest";

import {
  checkCaptureEligibility,
  getHold,
  getHoldingsFor,
  getPendingQueue,
  LOCK_DURATION_MS,
  reviewCapture,
  RuleError,
  saveMonument,
  setMonumentActive,
  startCapture,
  submitCapturePhoto,
} from "./rules";
import { createSeedState, seedMonuments } from "./seed";

const NOW = Date.UTC(2026, 10, 3, 17, 0, 0);
const ARCH = { latitude: 40.7312, longitude: -73.9971 };
const atArch = { ...ARCH, accuracyMeters: 8 };

function capturedAndPending(state = createSeedState(NOW), playerId = "u-priya") {
  const started = startCapture(state, { monumentId: "washington-arch", playerId, position: atArch, simulated: true }, NOW);
  const submitted = submitCapturePhoto(started.state, started.capture.id, "data:image/png;base64,x", NOW);
  return { state: submitted, captureId: started.capture.id };
}

describe("hold status", () => {
  it("derives holds from unexpired approvals at read time", () => {
    const state = createSeedState(NOW);
    expect(getHold(state, "bethesda", NOW)).toMatchObject({ status: "held", holder: { id: "u-sam" } });
    // The arch's lock expired ten minutes before NOW.
    expect(getHold(state, "washington-arch", NOW).status).toBe("free");
    expect(getHoldingsFor(state, "u-alex", NOW).map((h) => h.monument.id)).toEqual(["liberty"]);
  });

  it("frees a monument once its lock expires", () => {
    const state = createSeedState(NOW);
    const hold = getHold(state, "bethesda", NOW);
    if (hold.status !== "held") throw new Error("expected held");
    expect(getHold(state, "bethesda", hold.lockedUntil - 1).status).toBe("held");
    expect(getHold(state, "bethesda", hold.lockedUntil).status).toBe("free");
  });
});

describe("capture checks run cheapest first", () => {
  const state = createSeedState(NOW);

  it("rejects poor GPS accuracy before measuring distance", () => {
    const far = { latitude: 0, longitude: 0, accuracyMeters: 200 };
    expect(checkCaptureEligibility(state, "washington-arch", "u-priya", far, NOW)).toMatchObject({ ok: false, code: "inaccurate" });
  });

  it("rejects players outside the radius", () => {
    const tooFar = { latitude: 40.74, longitude: -73.9971, accuracyMeters: 8 };
    expect(checkCaptureEligibility(state, "washington-arch", "u-priya", tooFar, NOW)).toMatchObject({ ok: false, code: "outside" });
  });

  it("rejects locked monuments even when the player is standing there", () => {
    const atBethesda = { latitude: 40.7744, longitude: -73.9703, accuracyMeters: 8 };
    expect(checkCaptureEligibility(state, "bethesda", "u-priya", atBethesda, NOW)).toMatchObject({ ok: false, code: "locked" });
  });

  it("rejects deactivated monuments", () => {
    const inactive = setMonumentActive(state, "washington-arch", false);
    expect(checkCaptureEligibility(inactive, "washington-arch", "u-priya", atArch, NOW)).toMatchObject({ ok: false, code: "inactive" });
  });

  it("allows an accurate, close player on a free monument", () => {
    expect(checkCaptureEligibility(state, "washington-arch", "u-priya", atArch, NOW)).toEqual({ ok: true, distanceMeters: 0 });
  });

  it("does not create a capture record when a check fails", () => {
    const tooFar = { latitude: 40.74, longitude: -73.9971, accuracyMeters: 8 };
    expect(() => startCapture(state, { monumentId: "washington-arch", playerId: "u-priya", position: tooFar, simulated: false }, NOW))
      .toThrow(RuleError);
  });
});

describe("capture lifecycle", () => {
  it("moves in_progress → pending → approved and locks the monument", () => {
    const seed = createSeedState(NOW);
    const started = startCapture(seed, { monumentId: "washington-arch", playerId: "u-priya", position: atArch, simulated: true }, NOW);
    expect(started.capture.status).toBe("in_progress");

    const pending = submitCapturePhoto(started.state, started.capture.id, "data:image/png;base64,x", NOW);
    expect(getPendingQueue(pending).map((q) => q.capture.id)).toContain(started.capture.id);
    expect(getHold(pending, "washington-arch", NOW).status).toBe("free");

    const approved = reviewCapture(pending, { captureId: started.capture.id, moderatorId: "u-morgan", decision: "approved", reason: "Looks right" }, NOW);
    const hold = getHold(approved, "washington-arch", NOW);
    expect(hold).toMatchObject({ status: "held", holder: { id: "u-priya" }, lockedUntil: NOW + LOCK_DURATION_MS });
    expect(getPendingQueue(approved).map((q) => q.capture.id)).not.toContain(started.capture.id);
  });

  it("records the reason on rejection and leaves the monument free", () => {
    const { state, captureId } = capturedAndPending();
    const rejected = reviewCapture(state, { captureId, moderatorId: "u-morgan", decision: "rejected", reason: "Photo of a screen" }, NOW);
    expect(rejected.captures.find((c) => c.id === captureId)?.status).toBe("rejected");
    expect(rejected.reviews.at(-1)).toMatchObject({ decision: "rejected", reason: "Photo of a screen", lockedUntil: null });
    expect(getHold(rejected, "washington-arch", NOW).status).toBe("free");
  });

  it("requires a photo before submitting", () => {
    const started = startCapture(createSeedState(NOW), { monumentId: "washington-arch", playerId: "u-priya", position: atArch, simulated: true }, NOW);
    expect(() => submitCapturePhoto(started.state, started.capture.id, "", NOW)).toThrow("photo");
  });

  it("blocks a second pending capture of the same monument by the same player", () => {
    const { state } = capturedAndPending();
    expect(checkCaptureEligibility(state, "washington-arch", "u-priya", atArch, NOW)).toMatchObject({ ok: false, code: "duplicate" });
  });
});

describe("moderation", () => {
  it("produces exactly one holder when two captures of one monument are approved", () => {
    const first = capturedAndPending(createSeedState(NOW), "u-priya");
    const second = capturedAndPending(first.state, "u-alex");
    const approvedOnce = reviewCapture(second.state, { captureId: first.captureId, moderatorId: "u-morgan", decision: "approved", reason: "ok ok" }, NOW);
    expect(() => reviewCapture(approvedOnce, { captureId: second.captureId, moderatorId: "u-morgan", decision: "approved", reason: "ok ok" }, NOW))
      .toThrow("already held");
    expect(getHold(approvedOnce, "washington-arch", NOW)).toMatchObject({ holder: { id: "u-priya" } });
  });

  it("lets a moderator approve without a reason (US-14)", () => {
    const { state, captureId } = capturedAndPending();
    const approved = reviewCapture(state, { captureId, moderatorId: "u-morgan", decision: "approved", reason: "" }, NOW);
    expect(approved.reviews.at(-1)).toMatchObject({ decision: "approved", reason: "" });
    expect(getHold(approved, "washington-arch", NOW)).toMatchObject({ holder: { id: "u-priya" } });
  });

  it("only lets moderators review, only once, and only rejects with a reason", () => {
    const { state, captureId } = capturedAndPending();
    expect(() => reviewCapture(state, { captureId, moderatorId: "u-alex", decision: "approved", reason: "fine" }, NOW)).toThrow("moderators");
    expect(() => reviewCapture(state, { captureId, moderatorId: "u-morgan", decision: "rejected", reason: "  " }, NOW)).toThrow("reason");
    const done = reviewCapture(state, { captureId, moderatorId: "u-morgan", decision: "rejected", reason: "blurry" }, NOW);
    expect(() => reviewCapture(done, { captureId, moderatorId: "u-morgan", decision: "approved", reason: "fine" }, NOW)).toThrow("already been reviewed");
  });
});

describe("seeded error cases", () => {
  it("has a pending capture on a held monument that can't be approved", () => {
    const state = createSeedState(NOW);
    const stuck = getPendingQueue(state).find((q) => q.monument?.id === "bethesda");
    expect(stuck?.player?.id).toBe("u-priya");
    expect(() => reviewCapture(state, { captureId: stuck!.capture.id, moderatorId: "u-morgan", decision: "approved", reason: "looks ok" }, NOW))
      .toThrow("already held by Sam Chen");
  });

  it("refuses a player trying to capture a monument they already hold", () => {
    const atLiberty = { latitude: 40.6892, longitude: -74.0445, accuracyMeters: 8 };
    expect(checkCaptureEligibility(createSeedState(NOW), "liberty", "u-alex", atLiberty, NOW))
      .toMatchObject({ ok: false, code: "locked", message: expect.stringContaining("Held by you") });
  });
});

describe("monument management", () => {
  it("adds and edits monuments with validation", () => {
    const base = { name: "Test Statue", neighborhood: "Midtown", description: "", latitude: 40.75, longitude: -73.98, captureRadiusMeters: 50 };
    const added = saveMonument(createSeedState(NOW), base);
    expect(added.state.monuments).toHaveLength(seedMonuments.length + 1);
    const edited = saveMonument(added.state, { ...base, id: added.monument.id, name: "Renamed" });
    expect(edited.state.monuments.find((x) => x.id === added.monument.id)?.name).toBe("Renamed");
    expect(() => saveMonument(added.state, { ...base, latitude: 120 })).toThrow("Latitude");
    expect(() => saveMonument(added.state, { ...base, captureRadiusMeters: 2 })).toThrow("radius");
  });
});

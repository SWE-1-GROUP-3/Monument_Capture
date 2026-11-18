import { describe, expect, it } from "vitest";

import { getHold, releaseHold, reviewCapture, RuleError } from "./rules";
import { getHoldIntervals } from "./selectors";
import { createSeedState } from "./seed";

const NOW = Date.parse("2026-11-18T01:00:00Z");

describe("a moderator ends a hold early (local rules)", () => {
  // The seed has Bethesda Fountain held by Sam, and Priya's capture of it waiting.
  const seed = () => createSeedState(NOW);

  it("frees the monument now and records who, when and why", () => {
    const before = seed();
    expect(getHold(before, "bethesda", NOW).status).toBe("held");
    const after = releaseHold(before, { monumentId: "bethesda", moderatorId: "u-morgan", reason: "  Screenshot photo " }, NOW);
    expect(getHold(after, "bethesda", NOW).status).toBe("free");
    const review = after.reviews.find((r) => r.releasedAt);
    expect(review).toMatchObject({ releasedAt: NOW, releasedBy: "u-morgan", releaseReason: "Screenshot photo", lockedUntil: NOW });
    // The approval itself stays in the history.
    expect(after.captures.find((c) => c.id === review?.captureId)?.status).toBe("approved");
  });

  it("ends the holder's hold interval at the release time", () => {
    const after = releaseHold(seed(), { monumentId: "bethesda", moderatorId: "u-morgan", reason: "Cheating" }, NOW);
    const sam = getHoldIntervals(after, "u-sam", NOW + 60_000, "bethesda").at(-1);
    expect(sam).toMatchObject({ end: NOW, active: false });
  });

  it("lets the waiting capture be approved afterwards", () => {
    const after = releaseHold(seed(), { monumentId: "bethesda", moderatorId: "u-morgan", reason: "Cheating" }, NOW);
    const waiting = after.captures.find((c) => c.monumentId === "bethesda" && c.status === "pending")!;
    const approved = reviewCapture(after, { captureId: waiting.id, moderatorId: "u-morgan", decision: "approved", reason: "" }, NOW + 1000);
    expect(getHold(approved, "bethesda", NOW + 1000).status).toBe("held");
  });

  it.each([
    [{ moderatorId: "u-alex", reason: "Because" }, /Only moderators/],
    [{ moderatorId: "u-morgan", reason: " " }, /reason is required/],
  ])("refuses %o", (input, message) => {
    expect(() => releaseHold(seed(), { monumentId: "bethesda", ...input }, NOW)).toThrow(message);
  });

  it("refuses a monument nobody holds", () => {
    expect(() => releaseHold(seed(), { monumentId: "grant", moderatorId: "u-morgan", reason: "Cheating" }, NOW)).toThrow(RuleError);
  });
});

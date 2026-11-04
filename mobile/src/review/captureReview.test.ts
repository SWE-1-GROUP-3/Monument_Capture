import { describe, expect, it } from "vitest";

import { getCapturesFor, getPendingQueue, reviewCapture, ReviewError, reviewFor, STATUS_LABEL, submitCapture } from "./captureReview";
import { createMockState } from "./mockData";

const NOW = Date.UTC(2026, 10, 3, 17, 0, 0);
const photo = "data:image/png;base64,x";

function submitted() {
  const result = submitCapture(createMockState(NOW), { monumentId: "washington-arch", playerId: "u-alex", monumentPhotoUri: photo, distanceMeters: 15 }, NOW);
  return { state: result.state, id: result.capture.id };
}
const decide = (state: ReturnType<typeof createMockState>, captureId: string, decision: "approved" | "rejected", reason = "", moderatorId = "u-morgan") =>
  reviewCapture(state, { captureId, moderatorId, decision, reason }, NOW);

describe("US-09 pending review", () => {
  it("a submitted capture appears with a Pending Review status", () => {
    const { state, id } = submitted();
    const mine = getCapturesFor(state, "u-alex").find((x) => x.capture.id === id);
    expect(mine?.capture.status).toBe("pending");
    expect(STATUS_LABEL[mine!.capture.status]).toBe("Pending Review");
  });

  it("a failed submission creates no record and says it was not received", () => {
    const before = createMockState(NOW);
    expect(() => submitCapture(before, { monumentId: "washington-arch", playerId: "u-alex", monumentPhotoUri: "", distanceMeters: 15 }, NOW))
      .toThrow(/not received/);
    expect(() => submitCapture(before, { monumentId: "nowhere", playerId: "u-alex", monumentPhotoUri: photo, distanceMeters: 15 }, NOW))
      .toThrow(ReviewError);
    expect(before.captures).toHaveLength(4);
  });

  it("stays Pending Review until a moderator decision is recorded", () => {
    const { state, id } = submitted();
    expect(getCapturesFor(state, "u-alex").find((x) => x.capture.id === id)?.capture.status).toBe("pending");
    expect(reviewFor(state, id)).toBeUndefined();
  });
});

describe("US-10 approved", () => {
  it("approval changes the status to Approved and it stays in the player's record", () => {
    const { state, id } = submitted();
    const approved = decide(state, id, "approved");
    const entry = getCapturesFor(approved, "u-alex").find((x) => x.capture.id === id);
    expect(entry?.capture.status).toBe("approved");
    expect(entry?.review?.decision).toBe("approved");
  });
});

describe("US-11 rejected with a reason", () => {
  it("rejection changes the status to Rejected and the reason is available to the player", () => {
    const { state, id } = submitted();
    const rejected = decide(state, id, "rejected", "Too blurry to verify");
    const entry = getCapturesFor(rejected, "u-alex").find((x) => x.capture.id === id);
    expect(entry?.capture.status).toBe("rejected");
    expect(entry?.review?.reason).toBe("Too blurry to verify");
  });

  it("an earlier rejection keeps its status and reason", () => {
    const old = getCapturesFor(createMockState(NOW), "u-alex").find((x) => x.capture.id === "c-4");
    expect(old?.capture.status).toBe("rejected");
    expect(old?.review?.reason).toMatch(/laptop screen/);
  });
});

describe("US-13 moderation queue", () => {
  it("lists pending captures oldest first with photo, distance and submission time", () => {
    const queue = getPendingQueue(createMockState(NOW));
    expect(queue.map((q) => q.capture.id)).toEqual(["c-1", "c-2"]);
    expect(queue[0]?.capture).toMatchObject({ monumentPhotoUri: expect.any(String), distanceMeters: expect.any(Number), submittedAt: expect.any(Number) });
  });

  it("is empty once everything is reviewed", () => {
    let state = createMockState(NOW);
    state = decide(state, "c-1", "approved");
    state = decide(state, "c-2", "rejected", "Too blurry to verify");
    expect(getPendingQueue(state)).toEqual([]);
  });
});

describe("US-14 approve or reject with a recorded reason", () => {
  it("records an approval without needing a reason", () => {
    const { state, id } = submitted();
    expect(decide(state, id, "approved").reviews.at(-1)).toMatchObject({ captureId: id, decision: "approved", reason: "", moderatorId: "u-morgan" });
  });

  it("refuses a rejection without a reason", () => {
    const { state, id } = submitted();
    expect(() => decide(state, id, "rejected", "  ")).toThrow("A reason is required to reject a capture.");
  });

  it("refuses decisions from anyone who is not a moderator", () => {
    const { state, id } = submitted();
    expect(() => decide(state, id, "approved", "", "u-sam")).toThrow("Only moderators");
  });

  it("refuses a second decision on the same capture", () => {
    const { state, id } = submitted();
    const done = decide(state, id, "approved");
    expect(() => decide(done, id, "rejected", "Changed my mind")).toThrow("already been reviewed");
  });
});

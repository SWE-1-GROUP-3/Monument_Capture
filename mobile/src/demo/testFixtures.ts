import { LOCK_DURATION_MS } from "./rules";
import { createSeedState } from "./seed";
import type { Capture, CaptureReview } from "./types";

const MINUTE = 60_000;
const DAY_MIN = 24 * 60;

/** Rich capture history used only by tests; production starts with a clean state. */
export function createPopulatedTestState(now: number) {
  const state = createSeedState(now);
  const captures: Capture[] = [];
  const reviews: CaptureReview[] = [];
  let sequence = 0;

  const add = (
    monumentId: string,
    playerId: string,
    submittedMinutesAgo: number,
    outcome?: { decision: "approved" | "rejected"; reviewedMinutesAgo: number; reason: string },
  ) => {
    sequence += 1;
    const submittedAt = now - submittedMinutesAgo * MINUTE;
    const capture: Capture = {
      id: `c-test-${sequence}`,
      monumentId,
      playerId,
      status: outcome?.decision ?? "pending",
      distanceMeters: 12,
      accuracyMeters: 8,
      photoUri: "data:image/png;base64,dGVzdA==",
      startedAt: submittedAt - 2 * MINUTE,
      submittedAt,
    };
    captures.push(capture);
    if (outcome) {
      const reviewedAt = now - outcome.reviewedMinutesAgo * MINUTE;
      reviews.push({
        id: `r-test-${sequence}`,
        captureId: capture.id,
        moderatorId: "u-morgan",
        decision: outcome.decision,
        reason: outcome.reason,
        reviewedAt,
        lockedUntil: outcome.decision === "approved" ? reviewedAt + LOCK_DURATION_MS : null,
      });
    }
  };

  add("liberty", "u-alex", 45, { decision: "approved", reviewedMinutesAgo: 40, reason: "Clear shot." });
  add("bethesda", "u-sam", 30, { decision: "approved", reviewedMinutesAgo: 25, reason: "Angel visible." });
  add("obelisk", "u-priya", 15, { decision: "approved", reviewedMinutesAgo: 10, reason: "Matches." });
  add("washington-arch", "u-sam", 75, { decision: "approved", reviewedMinutesAgo: 70, reason: "Good photo." });
  add("bethesda", "u-priya", 27);
  add("flatiron-worth", "u-alex", 120, { decision: "rejected", reviewedMinutesAgo: 110, reason: "Photo is of a laptop screen, not the monument." });
  add("grant", "u-priya", 12);
  add("columbus", "u-sam", 5);
  add("brooklyn-war", "u-alex", 2);
  add("charging-bull", "u-alex", 6 * DAY_MIN + 10, { decision: "approved", reviewedMinutesAgo: 6 * DAY_MIN, reason: "" });
  add("charging-bull", "u-alex", 5 * DAY_MIN + 10, { decision: "rejected", reviewedMinutesAgo: 5 * DAY_MIN, reason: "Too blurry." });
  add("liberty", "u-alex", 4 * DAY_MIN + 10, { decision: "approved", reviewedMinutesAgo: 4 * DAY_MIN, reason: "" });
  add("liberty", "u-alex", 2 * DAY_MIN + 10, { decision: "approved", reviewedMinutesAgo: 2 * DAY_MIN, reason: "" });
  add("alice", "u-alex", 3 * DAY_MIN + 10, { decision: "approved", reviewedMinutesAgo: 3 * DAY_MIN, reason: "" });
  add("alice", "u-alex", 3 * DAY_MIN - 55, { decision: "approved", reviewedMinutesAgo: 3 * DAY_MIN - 65, reason: "" });
  add("alice", "u-sam", 3 * DAY_MIN - 140, { decision: "approved", reviewedMinutesAgo: 3 * DAY_MIN - 150, reason: "" });
  add("washington-arch", "u-alex", DAY_MIN + 10, { decision: "approved", reviewedMinutesAgo: DAY_MIN, reason: "" });
  add("bethesda", "u-priya", 2 * DAY_MIN + 10, { decision: "approved", reviewedMinutesAgo: 2 * DAY_MIN, reason: "" });

  return { ...state, captures, reviews };
}

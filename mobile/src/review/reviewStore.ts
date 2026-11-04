// Single store for the review flow. Screens read with useReviewState() and
// change data only through `reviews.*`. Saved in the browser so a refresh
// keeps the demo state.
import { useSyncExternalStore } from "react";

import * as rules from "./captureReview";
import { createMockState, MOCK_VERSION, samplePhoto } from "./mockData";
import type { ReviewDecision, ReviewState } from "./types";

const KEY = "monument-capture-reviews";

function load(): ReviewState {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ReviewState) : null;
    if (parsed?.version === MOCK_VERSION) return parsed;
  } catch {
    // Storage blocked or corrupt: start from the mock data.
  }
  return createMockState(Date.now());
}

let state: ReviewState = load();
const listeners = new Set<() => void>();

function setState(next: ReviewState) {
  state = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Keep working in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getReviewState() {
  return state;
}

export function useReviewState(): ReviewState {
  return useSyncExternalStore(subscribe, getReviewState, getReviewState);
}

export function useCurrentUser() {
  const s = useReviewState();
  return rules.findUser(s, s.currentUserId);
}

export const reviews = {
  submit(monumentId: string, monumentPhotoUri: string, distanceMeters: number) {
    const result = rules.submitCapture(state, { monumentId, playerId: state.currentUserId, monumentPhotoUri, distanceMeters }, Date.now());
    setState(result.state);
    return result.capture;
  },
  /**
   * Stand-in for the capture flow (US-05 to US-08) until it is merged: submits
   * a sample capture, or a broken one (no photo) to show a failed submission.
   */
  submitTest(options: { fail: boolean }) {
    const monumentId = "washington-arch";
    return reviews.submit(monumentId, options.fail ? "" : samplePhoto("Washington Square Arch", 260), 18);
  },
  decide(captureId: string, decision: ReviewDecision, reason: string) {
    setState(rules.reviewCapture(state, { captureId, moderatorId: state.currentUserId, decision, reason }, Date.now()));
  },
  /** Stand-in for login until US-01 is merged. */
  switchUser(userId: string) {
    if (rules.findUser(state, userId)) setState({ ...state, currentUserId: userId });
  },
  reset() {
    setState({ ...createMockState(Date.now()), currentUserId: state.currentUserId });
  },
};

export function __setReviewStateForTests(next: ReviewState) {
  setState(next);
}

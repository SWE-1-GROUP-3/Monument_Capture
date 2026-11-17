// The app's temporary local source of truth.
//
// Screens read state with useDemoState() and change it only through `demo.*`
// actions. The rules themselves live in rules.ts. When the team moves to
// a backend, this file is the one that gets rewritten: the actions
// become API calls and the screens stay the same.

import { useEffect, useState, useSyncExternalStore } from "react";

import type { PlayerPosition } from "../features/capture/types";
import * as rules from "./rules";
import { createSeedState, SEED_VERSION } from "./seed";
import { demoStorage } from "./storage";
import type { DemoState, ReviewDecision, User } from "./types";

let state: DemoState = loadInitialState();
let lastSaveOk = true;
let sharedSession = false;
let signOut: (() => Promise<void>) | undefined;
const listeners = new Set<() => void>();

function loadInitialState(): DemoState {
  const raw = demoStorage.load();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === SEED_VERSION && Array.isArray(parsed.monuments)) return { ...parsed, sessionUserId: null };
    } catch {
      // Corrupt or old data: fall through to a fresh seed.
    }
  }
  return createSeedState(Date.now());
}

function setState(next: DemoState) {
  state = next;
  lastSaveOk = demoStorage.save(JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoState() {
  return state;
}

/** Local clock. Replace with server time when the backend is connected. */
export function demoNow() {
  return Date.now();
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getDemoState, getDemoState);
}

export function useCurrentUser(): User | undefined {
  const s = useDemoState();
  return rules.findUser(s, s.sessionUserId);
}

/** Current game time, re-rendering every `intervalMs` so countdowns tick. */
export function useNow(intervalMs = 1000) {
  const [real, setReal] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setReal(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return real;
}

export function isPersisting() {
  return lastSaveOk;
}

export const demo = {
  // ----- Session -----
  logout() {
    setState({ ...state, sessionUserId: null });
    if (signOut) void signOut();
  },

  // ----- Capture flow -----
  checkEligibility(monumentId: string, playerId: string, position: PlayerPosition) {
    return rules.checkCaptureEligibility(state, monumentId, playerId, position, demoNow());
  },
  startCapture(monumentId: string, playerId: string, position: PlayerPosition) {
    if (state.sessionUserId !== playerId) throw new rules.RuleError("Sign in to create a draft.");
    const result = rules.startCapture(state, { monumentId, playerId, position }, demoNow());
    setState(result.state);
    return result.capture;
  },
  saveDraftPhoto(draftId: string, photoUri: string) {
    requireOwnDraft(draftId);
    setState(rules.saveDraftPhoto(state, draftId, photoUri));
  },
  submitPhoto(captureId: string, photoUri: string, position?: PlayerPosition) {
    requireOwnDraft(captureId);
    if (sharedSession) throw new rules.RuleError("Capture submission is not available yet. Your draft is saved.");
    setState(rules.submitCapturePhoto(state, captureId, photoUri, demoNow(), position));
  },
  cancelCapture(captureId: string) {
    requireOwnDraft(captureId);
    setState(rules.cancelCapture(state, captureId));
  },

  // ----- Moderation -----
  review(captureId: string, moderatorId: string, decision: ReviewDecision, reason: string) {
    if (sharedSession) throw new rules.RuleError("Capture review is not available yet.");
    setState(rules.reviewCapture(state, { captureId, moderatorId, decision, reason }, demoNow()));
  },
  saveMonument(input: rules.MonumentInput) {
    if (sharedSession) throw new rules.RuleError("Monument changes are not available yet.");
    const result = rules.saveMonument(state, input);
    setState(result.state);
    return result.monument;
  },
  setMonumentActive(monumentId: string, active: boolean) {
    if (sharedSession) throw new rules.RuleError("Monument changes are not available yet.");
    setState(rules.setMonumentActive(state, monumentId, active));
  },
};

/** Test helper: replace the whole state. */
export function __setDemoStateForTests(next: DemoState) {
  sharedSession = false;
  setState(next);
}

function requireOwnDraft(id: string) {
  if (!state.sessionUserId || !state.drafts.some(d => d.id === id && d.playerId === state.sessionUserId)) {
    throw new rules.RuleError("This draft belongs to another account or is unavailable.");
  }
}

/** Auth bridge for screens still using the local gameplay store during step 6. */
export function setAuthenticatedUser(user: User | null) {
  sharedSession = !!user;
  setState({ ...state, sessionUserId: user?.id ?? null,
    users: user ? [...state.users.filter(u => u.id !== user.id), user] : state.users });
}

export function registerSignOut(action: (() => Promise<void>) | undefined) { signOut = action; }

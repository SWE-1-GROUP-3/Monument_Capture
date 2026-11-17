// The app's temporary local source of truth.
//
// Screens read state with useDemoState() and change it only through `demo.*`
// actions. The rules themselves live in rules.ts. When the team moves to
// a backend, this file is the one that gets rewritten: the actions
// become API calls and the screens stay the same.

import { useEffect, useState, useSyncExternalStore } from "react";

import type { PlayerPosition } from "../features/capture/types";
import * as rules from "./rules";
import { createSeedState, LOCAL_PASSWORD, SEED_VERSION } from "./seed";
import { demoStorage } from "./storage";
import type { DemoState, ReviewDecision, User } from "./types";

let state: DemoState = loadInitialState();
let lastSaveOk = true;
const listeners = new Set<() => void>();

function loadInitialState(): DemoState {
  const raw = demoStorage.load();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === SEED_VERSION && Array.isArray(parsed.monuments)) return parsed;
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
  /**
   * Temporary local email + password login. Replace this with the backend auth
   * call when authentication is connected.
   */
  login(email: string, password: string): User | null {
    const clean = email.trim().toLowerCase();
    const user = state.users.find((u) => u.email.toLowerCase() === clean);
    if (!user || password !== LOCAL_PASSWORD) return null;
    setState({ ...state, sessionUserId: user.id });
    return user;
  },
  logout() {
    setState({ ...state, sessionUserId: null });
  },

  // ----- Capture flow -----
  checkEligibility(monumentId: string, playerId: string, position: PlayerPosition) {
    return rules.checkCaptureEligibility(state, monumentId, playerId, position, demoNow());
  },
  startCapture(monumentId: string, playerId: string, position: PlayerPosition) {
    const result = rules.startCapture(state, { monumentId, playerId, position }, demoNow());
    setState(result.state);
    return result.capture;
  },
  submitPhoto(captureId: string, photoUri: string) {
    setState(rules.submitCapturePhoto(state, captureId, photoUri, demoNow()));
  },
  cancelCapture(captureId: string) {
    setState(rules.cancelCapture(state, captureId));
  },

  // ----- Moderation -----
  review(captureId: string, moderatorId: string, decision: ReviewDecision, reason: string) {
    setState(rules.reviewCapture(state, { captureId, moderatorId, decision, reason }, demoNow()));
  },
  saveMonument(input: rules.MonumentInput) {
    const result = rules.saveMonument(state, input);
    setState(result.state);
    return result.monument;
  },
  setMonumentActive(monumentId: string, active: boolean) {
    setState(rules.setMonumentActive(state, monumentId, active));
  },
};

/** Test helper: replace the whole state. */
export function __setDemoStateForTests(next: DemoState) {
  setState(next);
}

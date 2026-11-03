// The demo's single source of truth.
//
// Screens read state with useDemoState() and change it only through `demo.*`
// actions. The rules themselves live in rules.ts. When the team moves to
// Supabase or Firebase, this file is the one that gets rewritten: the actions
// become API calls and the screens stay the same.

import { useEffect, useState, useSyncExternalStore } from "react";

import type { PlayerPosition } from "../features/capture/types";
import * as rules from "./rules";
import { createSeedState, SEED_VERSION } from "./seed";
import { demoStorage } from "./storage";
import type { DemoState, Monument, ReviewDecision, SimulatedLocation, User } from "./types";

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

/** The game clock. Stands in for the server clock; the demo can fast-forward it. */
export function demoNow() {
  return Date.now() + state.settings.clockOffsetMs;
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
  const offset = useDemoState().settings.clockOffsetMs;
  const [real, setReal] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setReal(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return real + offset;
}

export function isPersisting() {
  return lastSaveOk;
}

export const demo = {
  // ----- Session -----
  login(email: string, name?: string): User {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new rules.RuleError("Enter a valid email address.");
    let user = state.users.find((u) => u.email.toLowerCase() === clean);
    let users = state.users;
    if (!user) {
      const fallback = (clean.split("@")[0] ?? clean).replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      user = { id: rules.newId("u"), email: clean, name: name?.trim() || fallback, role: "player" };
      users = [...users, user];
    }
    setState({ ...state, users, sessionUserId: user.id });
    return user;
  },
  logout() {
    setState({ ...state, sessionUserId: null });
  },

  // ----- Capture flow -----
  checkEligibility(monumentId: string, playerId: string, position: PlayerPosition) {
    return rules.checkCaptureEligibility(state, monumentId, playerId, position, demoNow());
  },
  startCapture(monumentId: string, playerId: string, position: PlayerPosition, simulated: boolean) {
    const result = rules.startCapture(state, { monumentId, playerId, position, simulated }, demoNow());
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

  // ----- Demo tools -----
  setLocation(location: SimulatedLocation) {
    setState({ ...state, settings: { ...state.settings, location } });
  },
  /** Pretend the player is standing ~12 m from a monument (so distances look realistic). */
  teleportTo(monument: Monument, accuracyMeters = 8) {
    demo.setLocation({
      mode: "simulated",
      latitude: monument.latitude + 0.0001,
      longitude: monument.longitude,
      accuracyMeters,
      label: `at ${monument.name}${accuracyMeters > 50 ? " (poor GPS)" : ""}`,
      monumentId: monument.id,
    });
  },
  advanceClock(ms: number) {
    setState({ ...state, settings: { ...state.settings, clockOffsetMs: state.settings.clockOffsetMs + ms } });
  },
  resetClock() {
    setState({ ...state, settings: { ...state.settings, clockOffsetMs: 0 } });
  },
  /** Restores the seed data but keeps the current user signed in. */
  reset() {
    const fresh = createSeedState(Date.now());
    const keep = rules.findUser(state, state.sessionUserId);
    const users = keep && !fresh.users.some((u) => u.id === keep.id) ? [...fresh.users, keep] : fresh.users;
    setState({ ...fresh, users, sessionUserId: keep?.id ?? null });
  },
};

/** Test helper: replace the whole state. */
export function __setDemoStateForTests(next: DemoState) {
  setState(next);
}

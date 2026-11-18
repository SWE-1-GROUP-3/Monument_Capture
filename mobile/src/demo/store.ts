// The demo's single source of truth.
//
// Screens read state with useDemoState() and change it only through `demo.*`
// actions. The rules themselves live in rules.ts. When the team moves to
// Supabase or Firebase, this file is the one that gets rewritten: the actions
// become API calls and the screens stay the same.

import { useEffect, useState, useSyncExternalStore } from "react";

import { backendMode, devToolsEnabled } from "../backend/config";
import { applyServerMap, type ServerMap } from "../backend/serverMap";
import type { PlayerPosition } from "../features/capture/types";
import * as rules from "./rules";
import { createSeedState, DEMO_PASSWORD, SEED_VERSION } from "./seed";
import { demoStorage } from "./storage";
import type { CameraMode, DemoState, Monument, ReviewDecision, SimulatedLocation, User } from "./types";

let state: DemoState = loadInitialState();
let lastSaveOk = true;
const listeners = new Set<() => void>();

function loadInitialState(): DemoState {
  const loaded = withoutDemoSettingsUnlessEnabled(loadSavedState() ?? initialWorld(Date.now()));
  return backendMode === "supabase" ? changeServerAccount(loaded, null) : loaded;
}

/**
 * Local mode: the seeded demo world (fake players, holds, a queue).
 * Supabase mode: an empty world that the server fills in on sign-in, so no
 * fake players ever appear next to real ones.
 */
function initialWorld(now: number): DemoState {
  const seed = createSeedState(now);
  if (backendMode === "local") return seed;
  return { ...seed, users: [], monuments: [], captures: [], reviews: [] };
}

/** How long an approval locks a monument: the server's setting in Supabase mode. */
export function lockDurationMs(s: DemoState) {
  return s.serverSettings?.lockDurationMs ?? rules.LOCK_DURATION_MS;
}

/** Everything that shifts the game clock: the demo fast-forward plus, in Supabase mode, the database clock. */
export function totalClockOffsetMs(s: DemoState) {
  return s.settings.clockOffsetMs + (s.serverClockOffsetMs ?? 0);
}

function loadSavedState(): DemoState | null {
  const raw = demoStorage.load();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoState;
    if (parsed && parsed.version === SEED_VERSION && Array.isArray(parsed.monuments)) return parsed;
  } catch {
    // Corrupt or old data: fall through to a fresh seed.
  }
  return null;
}

/**
 * With demo tools turned off (EXPO_PUBLIC_DEV_TOOLS, Supabase mode), a fake
 * location, camera mode or clock offset saved by an earlier session must not
 * linger with no way to undo it: fall back to the real device and clock.
 */
function withoutDemoSettingsUnlessEnabled(loaded: DemoState): DemoState {
  if (devToolsEnabled) return loaded;
  return { ...loaded, settings: { clockOffsetMs: 0, location: { mode: "real" }, camera: "real" } };
}

/** Drop session-derived data, but archive unfinished work by its owning player. */
function changeServerAccount(s: DemoState, user: User | null): DemoState {
  const drafts = new Map((s.accountDrafts ?? []).map((c) => [c.id, c]));
  // Replace this account's archive so cancelled drafts do not come back.
  if (s.sessionUserId) {
    for (const [id, c] of drafts) if (c.playerId === s.sessionUserId) drafts.delete(id);
  }
  for (const c of s.captures) {
    if (c.source !== "server" && (c.status === "in_progress" || c.status === "pending")) drafts.set(c.id, c);
  }
  const accountDrafts = [...drafts.values()];
  return { ...s, users: user ? [user] : [], sessionUserId: user?.id ?? null,
    monuments: [], reviews: [], serverClockOffsetMs: 0, accountDrafts,
    captures: user ? accountDrafts.filter((c) => c.playerId === user.id) : [] };
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

/** The game clock: the database clock in Supabase mode, which the demo tools can fast-forward. */
export function demoNow() {
  return Date.now() + totalClockOffsetMs(state);
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
  const offset = totalClockOffsetMs(useDemoState());
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
  /**
   * Mock email + password login (US-01). Returns the user, or null when the
   * email is unknown or the password is wrong. Every demo account uses DEMO_PASSWORD.
   */
  login(email: string, password: string): User | null {
    const clean = email.trim().toLowerCase();
    const user = state.users.find((u) => u.email.toLowerCase() === clean);
    if (!user || password !== DEMO_PASSWORD) return null;
    setState({ ...state, sessionUserId: user.id });
    return user;
  },
  /**
   * Signs in a user whose identity comes from the real backend (Supabase):
   * adds or refreshes them in the store's user list so the game rules and
   * screens can find them, and makes them the current session.
   */
  signInAs(user: User) {
    if (backendMode === "supabase" && state.sessionUserId !== user.id) {
      setState(changeServerAccount(state, user));
      return;
    }
    const exists = state.users.some((u) => u.id === user.id);
    const users = exists ? state.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) : [...state.users, user];
    setState({ ...state, users, sessionUserId: user.id });
  },
  /** Supabase mode: replace monuments and current holds with the server's (Stage 2). */
  applyServerMap(map: ServerMap, sentAt: number, receivedAt: number) {
    setState(applyServerMap(state, map, sentAt, receivedAt));
  },
  /** Demo tool: switch account without typing a password. */
  switchUser(userId: string) {
    if (!rules.findUser(state, userId)) return;
    setState({ ...state, sessionUserId: userId });
  },
  logout() {
    setState(backendMode === "supabase" ? changeServerAccount(state, null) : { ...state, sessionUserId: null });
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
  /**
   * Pretend the player is standing `offsetMeters` north of a monument.
   * The default 12 m keeps distances realistic; a large offset demos "too far".
   */
  teleportTo(monument: Monument, accuracyMeters = 8, offsetMeters = 12) {
    const far = offsetMeters > monument.captureRadiusMeters;
    demo.setLocation({
      mode: "simulated",
      latitude: monument.latitude + offsetMeters / 111_320,
      longitude: monument.longitude,
      accuracyMeters,
      label: `${far ? `${offsetMeters} m from` : "at"} ${monument.name}${accuracyMeters > 50 ? " (poor GPS)" : ""}`,
      monumentId: far ? undefined : monument.id,
    });
  },
  setCamera(camera: CameraMode) {
    setState({ ...state, settings: { ...state.settings, camera } });
  },
  advanceClock(ms: number) {
    setState({ ...state, settings: { ...state.settings, clockOffsetMs: state.settings.clockOffsetMs + ms } });
  },
  resetClock() {
    setState({ ...state, settings: { ...state.settings, clockOffsetMs: 0 } });
  },
  /** Restores the seed data but keeps the current user signed in. */
  reset() {
    if (backendMode === "supabase") {
      // Server data is the truth: drop only local leftovers and demo settings.
      setState({
        ...state,
        captures: state.captures.filter((c) => c.source === "server"),
        reviews: state.reviews.filter((r) => r.source === "server"),
        settings: { clockOffsetMs: 0, location: { mode: "real" }, camera: "real" },
      });
      return;
    }
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

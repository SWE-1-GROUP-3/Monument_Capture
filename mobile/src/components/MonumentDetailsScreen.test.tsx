import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, type PropsWithChildren } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MonumentDetailsScreen from "../../app/monuments/[monumentId]";
import { __setDemoStateForTests } from "../demo/store";
import { createSeedState } from "../demo/seed";
import type { DemoState, Monument } from "../demo/types";
import { BackToMapButton } from "./BackToMapButton";

// US-03 details tests (originally by Yuming), now reading the shared demo store.
const route = vi.hoisted(() => ({
  monumentId: "locked" as string | string[] | undefined,
  canGoBack: vi.fn(() => true), back: vi.fn(), replace: vi.fn(), push: vi.fn(),
}));
vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
vi.mock("./map/MonumentMap", () => ({ MonumentMap: () => null }));
vi.mock("./Screen", () => ({ Screen: ({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle?: string }>) => (
  <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}{children}</div>
) }));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ monumentId: route.monumentId }),
  useFocusEffect: (callback: () => (() => void)) => useEffect(callback, [callback]),
  router: route,
  Redirect: () => <p>redirected to login</p>,
}));

const NOW = Date.parse("2026-11-03T15:00:00.000Z");
const m = (id: string, name: string): Monument => ({
  id, name, neighborhood: "Test", description: "", latitude: 40, longitude: -74, captureRadiusMeters: 100, active: true,
});

/** Four monuments: locked until 18:00, never held, lock expired at 14:55, and corrupt lock data. */
function world(): DemoState {
  const base = createSeedState(NOW);
  const held = (monumentId: string, lockedUntil: number) => ({
    capture: { id: `c-${monumentId}`, monumentId, playerId: "u-sam", status: "approved" as const, distanceMeters: 5,
      accuracyMeters: 5, simulatedPosition: false, photoUri: "x", startedAt: NOW - 1, submittedAt: NOW - 1 },
    review: { id: `r-${monumentId}`, captureId: `c-${monumentId}`, moderatorId: "u-morgan", decision: "approved" as const,
      reason: "ok", reviewedAt: NOW - 1, lockedUntil },
  });
  const holds = [held("locked", Date.parse("2026-11-03T18:00:00.000Z")), held("expired", Date.parse("2026-11-03T14:55:00.000Z")), held("unknown", Number.NaN)];
  return {
    ...base,
    monuments: [m("locked", "Locked monument"), m("available", "Available monument"), m("expired", "Expired monument"), m("unknown", "Unknown monument")],
    captures: holds.map((h) => h.capture),
    reviews: holds.map((h) => h.review),
    sessionUserId: "u-priya",
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  __setDemoStateForTests(world());
  route.monumentId = "locked";
  route.canGoBack.mockReturnValue(true);
  route.back.mockClear();
  route.replace.mockClear();
  route.push.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows the selected monument, holder, and live countdown", () => {
  render(<MonumentDetailsScreen />);
  expect(screen.getByRole("heading", { name: "Locked monument" })).toBeTruthy();
  expect(screen.getByText("Locked")).toBeTruthy();
  // Once in the status card, once in "Recent holders".
  expect(screen.getAllByText("Sam Chen")).toHaveLength(2);
  expect(screen.getByText("03:00:00")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("02:59:59")).toBeTruthy();
  // Locked: no Start Capture, but the player can attempt it and see the lock error.
  expect(screen.queryByRole("button", { name: /^Start Capture$/ })).toBeNull();
  fireEvent.click(screen.getByText("Try to capture anyway"));
  expect(route.push).toHaveBeenCalledExactlyOnceWith("/capture?monumentId=locked");
});

it("starts the capture flow from an available monument", () => {
  route.monumentId = "available";
  render(<MonumentDetailsScreen />);
  fireEvent.click(screen.getByText("Start Capture"));
  expect(route.push).toHaveBeenCalledExactlyOnceWith("/capture?monumentId=available");
  expect(screen.queryByText("Proximity integration is pending.")).toBeNull();
});

it.each(["available", "expired"])("hides holder and countdown for %s", monumentId => {
  route.monumentId = monumentId;
  render(<MonumentDetailsScreen />);
  expect(screen.getByText("Available to capture")).toBeTruthy();
  expect(screen.queryByText("Held by")).toBeNull();
  expect(screen.queryByText("Remaining lock time")).toBeNull();
  // A past holder may still be listed under "Recent holders", but not as the current holder.
  expect(screen.queryAllByText("Sam Chen").length).toBeLessThanOrEqual(1);
});

it("switches status and removes holder and countdown together at expiration", () => {
  vi.setSystemTime(Date.parse("2026-11-03T17:59:59.000Z"));
  render(<MonumentDetailsScreen />);
  expect(screen.getByText("00:00:01")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("Available to capture")).toBeTruthy();
  expect(screen.queryByText("Held by")).toBeNull();
  expect(screen.queryByText("Remaining lock time")).toBeNull();
  // A past holder may still be listed under "Recent holders", but not as the current holder.
  expect(screen.queryAllByText("Sam Chen").length).toBeLessThanOrEqual(1);
  expect(screen.queryByText("00:00:00")).toBeNull();
});

it("shows unknown availability without exposing holder or countdown", () => {
  route.monumentId = "unknown";
  render(<MonumentDetailsScreen />);
  expect(screen.getByText("Status unknown")).toBeTruthy();
  expect(screen.getByText("Availability could not be determined.")).toBeTruthy();
  expect(screen.queryByText("Held by")).toBeNull();
  expect(screen.queryByText("Remaining lock time")).toBeNull();
});

it.each(["missing", undefined, ["locked", "available"]])("handles invalid ID %j without choosing a default", monumentId => {
  route.monumentId = monumentId;
  render(<MonumentDetailsScreen />);
  expect(screen.getByRole("heading", { name: "Monument not found" })).toBeTruthy();
  expect(screen.queryByText("Start Capture")).toBeNull();
});

it("sends signed-out visitors to login", () => {
  __setDemoStateForTests({ ...world(), sessionUserId: null });
  render(<MonumentDetailsScreen />);
  expect(screen.getByText("redirected to login")).toBeTruthy();
});

it("returns through history when available", () => {
  render(<BackToMapButton />);
  fireEvent.click(screen.getByRole("button", { name: "Back to map" }));
  expect(route.back).toHaveBeenCalledTimes(1);
  expect(route.replace).not.toHaveBeenCalled();
});

it("falls back to the map for a direct link with no navigation history", () => {
  route.canGoBack.mockReturnValue(false);
  render(<BackToMapButton />);
  fireEvent.click(screen.getByRole("button", { name: "Back to map" }));
  expect(route.replace).toHaveBeenCalledExactlyOnceWith("/");
  expect(route.back).not.toHaveBeenCalled();
});

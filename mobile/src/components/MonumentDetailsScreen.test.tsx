import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, type PropsWithChildren } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MonumentDetailsScreen from "../../app/monuments/[monumentId]";
import { BackToMapButton } from "./BackToMapButton";

const route = vi.hoisted(() => ({
  monumentId: "locked" as string | string[] | undefined,
  canGoBack: vi.fn(() => true), back: vi.fn(), replace: vi.fn(),
}));
vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("./Screen", () => ({ Screen: ({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle?: string }>) => (
  <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}{children}</div>
) }));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ monumentId: route.monumentId }),
  useFocusEffect: (callback: () => (() => void)) => useEffect(callback, [callback]),
  router: route,
}));
vi.mock("../data/mapMonuments", () => ({ mapMonuments: [
  { id: "locked", name: "Locked monument", latitude: 40, longitude: -74, captureRadiusMeters: 100, hold: { holderDisplayName: "Demo Player A", lockExpiresAt: "2026-11-03T18:00:00.000Z" } },
  { id: "available", name: "Available monument", latitude: 40, longitude: -74, captureRadiusMeters: 100, hold: null },
  { id: "expired", name: "Expired monument", latitude: 40, longitude: -74, captureRadiusMeters: 100, hold: { holderDisplayName: "Demo Player B", lockExpiresAt: "2026-11-03T14:55:00.000Z" } },
  { id: "unknown", name: "Unknown monument", latitude: 40, longitude: -74, captureRadiusMeters: 100, hold: { holderDisplayName: "Demo Player A", lockExpiresAt: "invalid" } },
] }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse("2026-11-03T15:00:00.000Z"));
  route.monumentId = "locked";
  route.canGoBack.mockReturnValue(true);
  route.back.mockClear();
  route.replace.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows the selected monument, holder, and live countdown with a disabled handoff", () => {
  render(<MonumentDetailsScreen />);
  expect(screen.getByRole("heading", { name: "Locked monument" })).toBeTruthy();
  expect(screen.getByText("Locked")).toBeTruthy();
  expect(screen.getByText("Demo Player A")).toBeTruthy();
  expect(screen.getByText("03:00:00")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("02:59:59")).toBeTruthy();
  const button = screen.getByRole("button", { name: "Start Capture" });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(button);
  expect(route.replace).not.toHaveBeenCalled();
  expect(screen.getByText("Proximity integration is pending.")).toBeTruthy();
});

it.each(["available", "expired"])("hides holder and countdown for %s", monumentId => {
  route.monumentId = monumentId;
  render(<MonumentDetailsScreen />);
  expect(screen.getByText("Available to capture")).toBeTruthy();
  expect(screen.queryByText("Held by")).toBeNull();
  expect(screen.queryByText("Remaining lock time")).toBeNull();
  expect(screen.queryByText(/Demo Player/)).toBeNull();
});

it("switches status and removes holder and countdown together at expiration", () => {
  vi.setSystemTime(Date.parse("2026-11-03T17:59:59.000Z"));
  render(<MonumentDetailsScreen />);
  expect(screen.getByText("00:00:01")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("Available to capture")).toBeTruthy();
  expect(screen.queryByText("Held by")).toBeNull();
  expect(screen.queryByText("Remaining lock time")).toBeNull();
  expect(screen.queryByText("Demo Player A")).toBeNull();
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
  expect(screen.queryByRole("button", { name: "Start Capture" })).toBeNull();
});

it("returns through history when available", () => {
  render(<BackToMapButton />);
  fireEvent.click(screen.getByRole("button", { name: "Back to map" }));
  expect(route.back).toHaveBeenCalledTimes(1);
  expect(route.replace).not.toHaveBeenCalled();
});

it("falls back to Explore for a direct link with no navigation history", () => {
  route.canGoBack.mockReturnValue(false);
  render(<BackToMapButton />);
  fireEvent.click(screen.getByRole("button", { name: "Back to map" }));
  expect(route.replace).toHaveBeenCalledExactlyOnceWith("/(tabs)/explore");
  expect(route.back).not.toHaveBeenCalled();
});

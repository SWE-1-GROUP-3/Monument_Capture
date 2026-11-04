import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { __setDemoStateForTests, demo, getDemoState } from "../demo/store";
import { createSeedState } from "../demo/seed";
import { GameHome } from "./GameHome.web";

// The map home replaces the old Explore tab, so the US-02 checks from its test
// (permission asked once, map usable after denial, one marker per monument) live here.
vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: "denied" })),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: { High: 6, Balanced: 3 },
}));
vi.mock("../location/requestPlayerLocation", () => import("../location/requestPlayerLocation.web"));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), canGoBack: vi.fn(() => true) }));
vi.mock("expo-router", () => ({ router, useLocalSearchParams: () => ({}) }));

const deny = () => {
  const getCurrentPosition = vi.fn((_ok: unknown, fail: (e: { code: number }) => void) => fail({ code: 1 }));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  return getCurrentPosition;
};

function renderAs(userId: string) {
  __setDemoStateForTests({ ...getDemoState(), sessionUserId: userId });
  const user = getDemoState().users.find((u) => u.id === userId)!;
  return render(<GameHome user={user} />);
}

beforeEach(() => {
  __setDemoStateForTests(createSeedState(Date.now()));
  router.push.mockClear();
});
afterEach(cleanup);

it("asks for location once, stays usable after denial, and shows one marker per active monument", async () => {
  const geo = deny();
  const { container, rerender } = renderAs("u-alex");
  await waitFor(() => expect(geo).toHaveBeenCalledTimes(1));
  rerender(<GameHome user={getDemoState().users[0]!} />);
  expect(geo).toHaveBeenCalledTimes(1);
  const active = getDemoState().monuments.filter((m) => m.active).length;
  expect(container.querySelectorAll(".mc-mon")).toHaveLength(active);
  expect(container.querySelector(".mc-me")).toBeNull();
  expect(screen.getByText("Location off · showing all monuments")).toBeTruthy();
});

it("colours pins by status: free, held by someone else, held by me", () => {
  deny();
  const { container } = renderAs("u-alex");
  expect(container.querySelectorAll(".mc-mon.mine")).toHaveLength(1); // Statue of Liberty
  expect(container.querySelectorAll(".mc-mon.held")).toHaveLength(2); // Bethesda (Sam), Needle (Priya)
  expect(container.querySelectorAll(".mc-mon.free").length).toBeGreaterThan(5);
});

it("puts the player, the capture ring and the in-range count on the map from the demo location", () => {
  deny();
  const arch = getDemoState().monuments.find((m) => m.id === "washington-arch")!;
  act(() => demo.teleportTo(arch));
  const { container } = renderAs("u-alex");
  expect(container.querySelector(".mc-me .body")?.textContent).toBe("AR");
  expect(container.querySelector("path.leaflet-interactive")).toBeTruthy();
  expect(screen.getByText("1 monument in range")).toBeTruthy();
  expect(screen.getByText("Greenwich Village")).toBeTruthy();
});

it("opens the monument sheet with an enabled Capture when free and in range", async () => {
  deny();
  const arch = getDemoState().monuments.find((m) => m.id === "washington-arch")!;
  act(() => demo.teleportTo(arch));
  renderAs("u-alex");
  fireEvent.click(screen.getByTitle(/^Washington Square Arch:/));
  const sheet = screen.getByLabelText("Monument");
  expect(within(sheet).getByText("Free to claim")).toBeTruthy();
  expect(within(sheet).getByText("12 m away · Greenwich Village")).toBeTruthy();
  expect(within(sheet).getByText("Nobody")).toBeTruthy();
  const cta = await within(sheet).findByRole("button", { name: "📷 Capture" });
  await waitFor(() => expect((cta as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(cta);
  expect(router.push).toHaveBeenCalledWith("/capture");
  expect(getDemoState().captures.some((c) => c.monumentId === "washington-arch" && c.status === "in_progress")).toBe(true);
});

it("disables Capture with a distance hint when out of range", async () => {
  deny();
  const arch = getDemoState().monuments.find((m) => m.id === "washington-arch")!;
  act(() => demo.teleportTo(arch, 8, 400));
  renderAs("u-alex");
  fireEvent.click(screen.getByTitle(/^Washington Square Arch:/));
  const sheet = screen.getByLabelText("Monument");
  expect(await within(sheet).findByText("Move 300 m closer to capture.")).toBeTruthy();
  expect((within(sheet).getByRole("button", { name: "📷 Capture" }) as HTMLButtonElement).disabled).toBe(true);
});

it("shows Locked, You hold this and Waiting for review for those states", () => {
  deny();
  renderAs("u-alex");
  fireEvent.click(screen.getByTitle(/^Bethesda Fountain:/));
  let sheet = screen.getByLabelText("Monument");
  expect(within(sheet).getByRole("button", { name: "Locked" })).toBeTruthy();
  expect(within(sheet).getByText("You can challenge it when the lock ends.")).toBeTruthy();
  expect(within(sheet).getByText("Sam Chen")).toBeTruthy();

  fireEvent.click(screen.getByTitle(/^Statue of Liberty:/));
  sheet = screen.getByLabelText("Monument");
  expect(within(sheet).getByRole("button", { name: "You hold this" })).toBeTruthy();
  expect(within(sheet).getByText("Held 3× · 2h 40m total")).toBeTruthy();

  fireEvent.click(screen.getByTitle(/^Brooklyn War Memorial:/));
  sheet = screen.getByLabelText("Monument");
  expect(within(sheet).getByRole("button", { name: "Waiting for review." })).toBeTruthy();
});

it("closes a sheet when the scrim is tapped", () => {
  deny();
  renderAs("u-alex");
  fireEvent.click(screen.getByText("Records"));
  expect(screen.getByLabelText("Records").className).toContain("on");
  fireEvent.click(screen.getByTestId("scrim"));
  expect(screen.getByLabelText("Records").className).not.toContain("on");
});

it("player bar: Profile with level, Records with all-time stats, Activity with holdings and history", () => {
  deny();
  renderAs("u-alex");
  expect(screen.getAllByText("LV 4").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByText("Records"));
  const records = screen.getByLabelText("Records");
  expect(within(records).getByText("70%")).toBeTruthy();
  expect(within(records).getByText("👑 Most held")).toBeTruthy();
  fireEvent.click(within(records).getByText("Statue of Liberty"));
  expect(within(records).getByText("3 of 3 (100%)")).toBeTruthy();

  fireEvent.click(screen.getByText("Activity"));
  const activity = screen.getByLabelText("Activity");
  expect(within(activity).getByText("Statue of Liberty")).toBeTruthy();
  fireEvent.click(within(activity).getByRole("tab", { name: "History" }));
  expect(within(activity).getByText("Rejected · Photo is of a laptop screen, not the monument.")).toBeTruthy();
});

it("Records shows an empty state with no history", () => {
  deny();
  renderAs("u-demo");
  fireEvent.click(screen.getByText("Records"));
  expect(within(screen.getByLabelText("Records")).getByText("No records yet.")).toBeTruthy();
});

it("moderator bar: Profile, Queue with a pending badge, Monuments", () => {
  deny();
  renderAs("u-morgan");
  expect(screen.queryByText("Records")).toBeNull();
  expect(screen.getByLabelText("4 waiting")).toBeTruthy();
  fireEvent.click(screen.getByText("Queue"));
  const queue = screen.getByLabelText("Queue");
  fireEvent.click(within(queue).getByText(/Columbus Monument/));
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/review\//));
});

it("uses OpenStreetMap tiles when no CARTO key is configured (CARTO now requires one)", () => {
  deny();
  const { container } = renderAs("u-alex");
  const tile = container.querySelector("img.leaflet-tile") as HTMLImageElement | null;
  expect(tile?.src).toContain("tile.openstreetmap.org");
  expect(container.innerHTML).not.toContain("cartocdn");
});

it("keeps the play area in view when real GPS puts the player far from every monument", async () => {
  // Somewhere in Brooklyn, kilometres from the nearest seeded monument.
  const getCurrentPosition = vi.fn((ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
    ok({ coords: { latitude: 40.64, longitude: -73.95 } }));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  const { container } = renderAs("u-alex");
  expect(await screen.findByText(/0 in range · nearest Soldiers' and Sailors' Arch, \d+\.\d km/)).toBeTruthy();
  // Every monument pin is still on the map, plus the player's own marker.
  expect(container.querySelectorAll(".mc-mon")).toHaveLength(getDemoState().monuments.filter((m) => m.active).length);
  expect(container.querySelector(".mc-me")).toBeTruthy();
});

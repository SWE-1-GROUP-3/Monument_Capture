import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import ExploreScreen from "../../../app/(tabs)/explore";

vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("../Screen", () => ({ Screen: ({ children }: PropsWithChildren) => <div>{children}</div> }));
vi.mock("./MonumentMap", () => import("./MonumentMap.web"));
vi.mock("../../location/requestPlayerLocation", () => import("../../location/requestPlayerLocation.web"));
const push = vi.hoisted(() => vi.fn());
vi.mock("expo-router", () => ({ router: { push }, useFocusEffect: (callback: () => (() => void)) => {
  useEffect(callback, [callback]);
} }));
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("opening Explore initiates permission flow once and keeps the map usable after denial", async () => {
  const getCurrentPosition = vi.fn((_success, failure) => failure({ code: 1 }));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  const { container, rerender } = render(<ExploreScreen />);
  await screen.findByText("Location permission denied. You can still explore the map.");
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
  rerender(<ExploreScreen />);
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Show my location" }));
  await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2));
});


it("refreshes status on clock ticks without repeating location requests or remounting the map", async () => {
  vi.useFakeTimers();
  const getCurrentPosition = vi.fn((_success, failure) => failure({ code: 1 }));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  const { container } = render(<ExploreScreen />);
  await act(async () => {});
  const map = container.querySelector(".leaflet-container");
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(container.querySelector(".leaflet-container")).toBe(map);
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
});


it("places a wrapping four-item legend below the map and above the location button", async () => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition: vi.fn((_success, failure) => failure({ code: 1 })),
  } });
  const { container } = render(<ExploreScreen />);
  await screen.findByText("Location permission denied. You can still explore the map.");
  const legend = screen.getByLabelText("Map legend");
  for (const label of ["Available", "Locked", "Status unknown", "Your location"]) {
    expect(legend.textContent).toContain(label);
  }
  expect(legend.children).toHaveLength(4);
  expect(getComputedStyle(legend).flexWrap).toBe("wrap");
  expect(container.querySelector(".leaflet-container")!.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(legend.compareDocumentPosition(screen.getByRole("button", { name: "Show my location" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});


it("opens details with only the selected monument ID from the popup action", async () => {
  push.mockClear();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition: vi.fn((_success, failure) => failure({ code: 1 })),
  } });
  render(<ExploreScreen />);
  await screen.findByText("Location permission denied. You can still explore the map.");
  fireEvent.click(screen.getByRole("button", { name: "Washington Square Arch: Locked" }));
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "View details" }));
  expect(push).toHaveBeenCalledExactlyOnceWith({ pathname: "/monuments/[monumentId]", params: { monumentId: "washington-arch" } });
});

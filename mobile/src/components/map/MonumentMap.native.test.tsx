import { act, fireEvent, cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { mapMonuments } from "../../data/mapMonuments";
import type { MapCoordinate } from "../../types/mapMonument";
import { MonumentMap } from "./MonumentMap";

vi.mock("react-native", () => vi.importActual("react-native-web"));

// This mock dispatches explicit marker IDs; it cannot reproduce native hit testing.
const nativeEvents = vi.hoisted(() => ({ onMarkerPress: undefined as undefined | ((event: { nativeEvent: { id: unknown } }) => void) }));
vi.mock("react-native-maps", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  type Press = (event: { nativeEvent: { id: unknown } }) => void;
  const MarkerPressContext = React.createContext<Press | undefined>(undefined);
  return {
    default: ({ children, onMarkerPress }: PropsWithChildren<{ onMarkerPress?: Press }>) => {
      nativeEvents.onMarkerPress = onMarkerPress;
      return <MarkerPressContext.Provider value={onMarkerPress}><div data-testid="native-map">{children}</div></MarkerPressContext.Provider>;
    },
    Marker: ({ coordinate, title, pinColor, accessibilityLabel, identifier, onPress }: {
      coordinate: MapCoordinate; title?: string; pinColor?: string; accessibilityLabel?: string; identifier?: string; onPress?: () => void;
    }) => {
      const press = React.useContext(MarkerPressContext);
      return <button title={title ?? accessibilityLabel?.split(": ")[0]} data-testid="native-marker"
        data-latitude={coordinate.latitude} data-longitude={coordinate.longitude} data-pin-color={pinColor}
        data-has-marker-handler={String(Boolean(onPress))}
        aria-label={accessibilityLabel ?? title} onClick={() => press?.({ nativeEvent: { id: identifier } })} />;
    },
  };
});
afterEach(cleanup);

it("passes every monument name and coordinate to a separate native marker", () => {
  render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={mapMonuments} playerLocation={null} />);
  expect(screen.getAllByTestId("native-marker")).toHaveLength(9);
  for (const monument of mapMonuments) {
    const marker = screen.getByTitle(monument.name);
    expect(marker.getAttribute("data-latitude")).toBe(String(monument.latitude));
    expect(marker.getAttribute("data-longitude")).toBe(String(monument.longitude));
  }
});

it("renders the native map with an empty list and no player location", () => {
  render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[]} playerLocation={null} />);
  expect(screen.getByTestId("native-map")).toBeTruthy();
  expect(screen.queryAllByTestId("native-marker")).toHaveLength(0);
});

it("adds a native player marker after permission provides coordinates", () => {
  render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[]} playerLocation={{ latitude: 40.75, longitude: -74 }} />);
  expect(screen.getByTitle("Your location").getAttribute("data-latitude")).toBe("40.75");
  expect(screen.getByTitle("Your location").getAttribute("data-pin-color")).toBe("blue");
});

it("handles missing native map data and skips invalid monuments", () => {
  const { rerender } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} playerLocation={null} />);
  expect(screen.queryAllByTestId("native-marker")).toHaveLength(0);
  rerender(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[null, { id: "bad", name: "Bad", latitude: NaN, longitude: 0 }, ...mapMonuments]} playerLocation={null} />);
  expect(screen.getAllByTestId("native-marker")).toHaveLength(9);
});


it("uses standard colored pins with accessible status and a card, updating at expiration", () => {
  const expires = Date.parse("2026-11-03T18:00:00Z");
  const base = mapMonuments[0]!;
  const monuments = [
    { ...base, id: "available", name: "Available monument", hold: null },
    { ...base, id: "locked", name: "Locked monument", hold: { holderDisplayName: "Demo Player A", lockExpiresAt: new Date(expires).toISOString() } },
    { ...base, id: "expired", name: "Expired monument", hold: { holderDisplayName: "Demo Player B", lockExpiresAt: new Date(expires - 1000).toISOString() } },
    { ...base, id: "unknown", name: "Unknown monument", hold: { holderDisplayName: "Demo Player A", lockExpiresAt: "invalid" } },
  ];
  const { rerender } = render(<MonumentMap onViewDetails={() => {}} monuments={monuments} playerLocation={null} nowMs={expires - 1} />);

  expect(screen.getByTitle("Available monument").getAttribute("data-pin-color")).toBe("#2f80ed");
  expect(screen.getByTitle("Locked monument").getAttribute("data-pin-color")).toBe("#e8590c");
  expect(screen.getByTitle("Unknown monument").getAttribute("data-pin-color")).toBe("#5d7780");
  expect(screen.getByLabelText("Locked monument: Locked")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Locked monument: Locked"));
  expect(screen.getByText("Locked")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start Capture" })).toBeNull();
  rerender(<MonumentMap onViewDetails={() => {}} monuments={monuments} playerLocation={null} nowMs={expires} />);
  expect(screen.getByLabelText("Locked monument: Available")).toBeTruthy();
  expect(screen.getByTitle("Locked monument").getAttribute("data-pin-color")).toBe("#2f80ed");
  expect(screen.getByText("Available to capture")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start Capture" }).getAttribute("aria-disabled")).toBe("true");
});


it("selects, replaces, dismisses, and reopens the native card without navigating on selection", () => {
  const onViewDetails = vi.fn();
  render(<MonumentMap monuments={mapMonuments} playerLocation={null} nowMs={Date.now()} onViewDetails={onViewDetails} />);
  expect(screen.queryByLabelText("Selected monument")).toBeNull();
  fireEvent.click(screen.getByLabelText("Statue of Liberty: Available"));
  expect(onViewDetails).not.toHaveBeenCalled();
  expect(screen.getByText("Statue of Liberty")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Start Capture" }));
  expect(onViewDetails).not.toHaveBeenCalled();
  expect(screen.queryByText("Proximity integration is pending.")).toBeNull();
  fireEvent.click(screen.getByLabelText("Washington Square Arch: Locked"));
  expect(screen.queryByText("Statue of Liberty")).toBeNull();
  expect(screen.getByText("Washington Square Arch")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start Capture" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss monument actions" }));
  expect(screen.queryByLabelText("Selected monument")).toBeNull();
  fireEvent.click(screen.getByLabelText("Washington Square Arch: Locked"));
  fireEvent.click(screen.getByRole("link", { name: "View details" }));
  expect(onViewDetails).toHaveBeenCalledExactlyOnceWith("washington-arch");
});

it("shows Start Capture only for available and expired native selections, hiding it for unknown", () => {
  const base = mapMonuments[0]!;
  const nowMs = Date.parse("2026-11-03T18:00:00Z");
  const monuments = [
    { ...base, id: "available", name: "Available monument", hold: null },
    { ...base, id: "expired", name: "Expired monument", hold: { holderDisplayName: "B", lockExpiresAt: new Date(nowMs - 1).toISOString() } },
    { ...base, id: "unknown", name: "Unknown monument", hold: { holderDisplayName: "A", lockExpiresAt: "invalid" } },
  ];
  render(<MonumentMap monuments={monuments} playerLocation={null} nowMs={nowMs} onViewDetails={() => {}} />);
  for (const name of ["Available monument: Available", "Expired monument: Available"]) {
    fireEvent.click(screen.getByLabelText(name));
    expect(screen.getByRole("button", { name: "Start Capture" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("link", { name: "View details" })).toBeTruthy();
  }
  fireEvent.click(screen.getByLabelText("Unknown monument: Status unknown"));
  expect(screen.queryByRole("button", { name: "Start Capture" })).toBeNull();
  expect(screen.getByText("Status unknown")).toBeTruthy();
  expect(screen.getByRole("link", { name: "View details" })).toBeTruthy();
});


it("preserves the tapped ID across clock ticks, new record objects, and list reordering until another press or dismissal", () => {
  const nowMs = Date.parse("2026-11-03T18:00:00Z");
  const base = mapMonuments[0]!;
  const monuments = [
    { ...base, id: "a", name: "Monument A", latitude: 40.7744, longitude: -73.9703,
      hold: { holderDisplayName: "A", lockExpiresAt: new Date(nowMs + 1000).toISOString() } },
    { ...base, id: "b", name: "Monument B", latitude: 40.7745, longitude: -73.9704, hold: null },
  ];
  const onViewDetails = vi.fn();
  const { rerender } = render(<MonumentMap monuments={monuments} playerLocation={null} nowMs={nowMs} onViewDetails={onViewDetails} />);
  fireEvent.click(screen.getByLabelText("Monument A: Locked"));
  const card = screen.getByLabelText("Selected monument");
  expect(card.textContent).toContain("Monument A");
  for (const tick of [500, 1000, 2000]) {
    rerender(<MonumentMap monuments={[...monuments].reverse().map(monument => ({ ...monument }))}
      playerLocation={{ latitude: 40, longitude: -74 }} nowMs={nowMs + tick} onViewDetails={onViewDetails} />);
    expect(screen.getByLabelText("Selected monument")).toBe(card);
    expect(card.textContent).toContain("Monument A");
    expect(card.textContent).not.toContain("Monument B");
  }
  expect(screen.getByText("Available to capture")).toBeTruthy();
  fireEvent.click(screen.getByRole("link", { name: "View details" }));
  expect(onViewDetails).toHaveBeenLastCalledWith("a");
  for (const marker of screen.getAllByTestId("native-marker")) {
    expect(marker.getAttribute("data-has-marker-handler")).toBe("false");
  }
  fireEvent.click(screen.getByLabelText("Monument B: Available"));
  expect(card.textContent).toContain("Monument B");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss monument actions" }));
  expect(screen.queryByLabelText("Selected monument")).toBeNull();
  rerender(<MonumentMap monuments={monuments} playerLocation={null} nowMs={nowMs + 3000} onViewDetails={onViewDetails} />);
  expect(screen.queryByLabelText("Selected monument")).toBeNull();
});

it("ignores player, unknown, and malformed IDs before and after selection", () => {
  render(<MonumentMap monuments={mapMonuments} playerLocation={{ latitude: 40, longitude: -74 }}
    nowMs={Date.now()} onViewDetails={() => {}} />);
  const ignoredIds = ["player-location", "missing", "", undefined, null, 42];
  for (const id of ignoredIds) act(() => nativeEvents.onMarkerPress!({ nativeEvent: { id } }));
  expect(screen.queryByLabelText("Selected monument")).toBeNull();
  fireEvent.click(screen.getByLabelText("Statue of Liberty: Available"));
  for (const id of ignoredIds) {
    act(() => nativeEvents.onMarkerPress!({ nativeEvent: { id } }));
    expect(screen.getByLabelText("Selected monument").textContent).toContain("Statue of Liberty");
  }
  fireEvent.click(screen.getByLabelText("Your location"));
  expect(screen.getByLabelText("Selected monument").textContent).toContain("Statue of Liberty");
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapMonuments } from "../../data/mapMonuments";
import { MonumentMap } from "./MonumentMap.web";

vi.mock("react-native", () => vi.importActual("react-native-web"));
afterEach(cleanup);

describe("browser monument map", () => {
  it("renders one separate marker for each mock monument", () => {
    const { container } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={mapMonuments} playerLocation={null} />);
    expect(mapMonuments).toHaveLength(9);
    expect(new Set(mapMonuments.map((m) => m.id)).size).toBe(9);
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
    for (const monument of mapMonuments) {
      expect(screen.getByTitle(new RegExp(`^${monument.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: `))).toBeTruthy();
    }
  });

  it("shows the selected monument name in a popup", () => {
    const monuments = mapMonuments.slice(0, 2);
    const { container } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={monuments} playerLocation={null} />);
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
    fireEvent.click(screen.getByTitle("Washington Square Arch: Locked"));
    expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Washington Square ArchLockedView details →");
  });

  it("keeps a usable base map and zoom controls for an empty list", () => {
    const { container } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[]} playerLocation={null} />);
    expect(container.querySelector(".leaflet-container")).toBeTruthy();
    expect(container.querySelector(".leaflet-tile-pane")).toBeTruthy();
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(0);
    expect(screen.getByTitle("Zoom in")).toBeTruthy();
  });

  it("adds the player marker only when coordinates are supplied", () => {
    const { rerender } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[]} playerLocation={null} />);
    expect(screen.queryByTitle("Your location")).toBeNull();
    rerender(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[]} playerLocation={{ latitude: 40.75, longitude: -74 }} />);
    expect(screen.getByTitle("Your location")).toBeTruthy();
  });
});

it("handles missing data and skips invalid records without losing valid markers", () => {
  const { container, rerender } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} playerLocation={null} />);
  expect(container.querySelector(".leaflet-container")).toBeTruthy();
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(0);
  rerender(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={[null, {}, { id: "bad", name: "Bad", latitude: 91, longitude: 0 }, ...mapMonuments]} playerLocation={null} />);
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
});

it("shows a non-blocking message for tile errors and keeps markers", () => {
  const { container } = render(<MonumentMap onViewDetails={() => {}} nowMs={Date.now()} monuments={mapMonuments} playerLocation={null} />);
  const tile = container.querySelector("img.leaflet-tile");
  expect(tile).not.toBeNull();
  fireEvent.error(tile!);
  expect(screen.getByRole("status").textContent).toContain("Map tiles could not load");
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
  fireEvent.click(screen.getByTitle("Washington Square Arch: Locked"));
  expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Washington Square ArchLockedView details →");
});


it("colors available, locked, expired, and unknown dots without permanent labels and updates an open popup at expiration", () => {
  const expires = Date.parse("2026-11-03T18:00:00Z");
  const base = mapMonuments[0]!;
  const monuments = [
    { ...base, id: "available", name: "Available monument", hold: null },
    { ...base, id: "locked", name: "Locked monument", hold: { holderDisplayName: "Demo Player A", lockExpiresAt: new Date(expires).toISOString() } },
    { ...base, id: "expired", name: "Expired monument", hold: { holderDisplayName: "Demo Player B", lockExpiresAt: new Date(expires - 1000).toISOString() } },
    { ...base, id: "unknown", name: "Unknown monument", hold: { holderDisplayName: "Demo Player A", lockExpiresAt: "invalid" } },
  ];
  const { container, rerender } = render(<MonumentMap onViewDetails={() => {}} monuments={monuments} playerLocation={null} nowMs={expires - 1} />);
  expect(screen.queryByText("Available")).toBeNull();
  expect(screen.queryByText("Locked")).toBeNull();
  expect(screen.queryByText("Status unknown")).toBeNull();
  expect(screen.getByRole("button", { name: "Locked monument: Locked" })).toBeTruthy();
  expect(screen.getByTitle("Locked monument: Locked").innerHTML).toContain("#e8590c");
  expect(screen.getByTitle("Available monument: Available").innerHTML).toContain("#2f80ed");
  expect(screen.getByTitle("Unknown monument: Status unknown").innerHTML).toContain("#5d7780");
  fireEvent.click(screen.getByTitle("Locked monument: Locked"));
  expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Locked monumentLockedView details →");
  rerender(<MonumentMap onViewDetails={() => {}} monuments={monuments} playerLocation={null} nowMs={expires} />);
  expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Locked monumentAvailable to captureView details →Start Capture");
  expect(screen.getByTitle("Locked monument: Available").innerHTML).toContain("#2f80ed");
  fireEvent.click(screen.getByTitle("Unknown monument: Status unknown"));
  expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Unknown monumentStatus unknownView details →");
  expect(container.textContent).not.toContain("Demo Player");
});


it("shows a disabled Start Capture placeholder only for available or expired monuments", () => {
  const expires = Date.parse("2026-11-03T18:00:00Z");
  const base = mapMonuments[0]!;
  const onViewDetails = vi.fn();
  const monuments = [
    { ...base, id: "available", name: "Available monument", hold: null },
    { ...base, id: "expired", name: "Expired monument", hold: { holderDisplayName: "Demo Player B", lockExpiresAt: new Date(expires - 1000).toISOString() } },
    { ...base, id: "locked", name: "Locked monument", hold: { holderDisplayName: "Demo Player A", lockExpiresAt: new Date(expires + 1000).toISOString() } },
    { ...base, id: "unknown", name: "Unknown monument", hold: { holderDisplayName: "Demo Player A", lockExpiresAt: "invalid" } },
  ];
  render(<MonumentMap monuments={monuments} playerLocation={null} nowMs={expires} onViewDetails={onViewDetails} />);
  for (const name of ["Available monument: Available", "Expired monument: Available"]) {
    fireEvent.click(screen.getByRole("button", { name }));
    const capture = screen.getByRole("button", { name: "Start Capture" });
    expect(capture.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByText("Proximity integration is pending.")).toBeNull();
    fireEvent.click(capture);
    expect(onViewDetails).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "View details" })).toBeTruthy();
  }
  for (const name of ["Locked monument: Locked", "Unknown monument: Status unknown"]) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.queryByRole("button", { name: "Start Capture" })).toBeNull();
    expect(screen.getByRole("link", { name: "View details" })).toBeTruthy();
  }
});

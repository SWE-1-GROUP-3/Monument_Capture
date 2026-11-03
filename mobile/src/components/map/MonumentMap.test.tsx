import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mapMonuments } from "../../data/mapMonuments";
import { MonumentMap } from "./MonumentMap.web";

afterEach(cleanup);

describe("browser monument map", () => {
  it("renders one separate marker for each mock monument", () => {
    const { container } = render(<MonumentMap monuments={mapMonuments} playerLocation={null} />);
    expect(mapMonuments).toHaveLength(9);
    expect(new Set(mapMonuments.map((m) => m.id)).size).toBe(9);
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
    for (const monument of mapMonuments) {
      expect(screen.getByTitle(monument.name)).toBeTruthy();
    }
  });

  it("shows the selected monument name in a popup", () => {
    const monuments = mapMonuments.slice(0, 2);
    const { container } = render(<MonumentMap monuments={monuments} playerLocation={null} />);
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
    fireEvent.click(screen.getByTitle("Washington Square Arch"));
    expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Washington Square Arch");
  });

  it("keeps a usable base map and zoom controls for an empty list", () => {
    const { container } = render(<MonumentMap monuments={[]} playerLocation={null} />);
    expect(container.querySelector(".leaflet-container")).toBeTruthy();
    expect(container.querySelector(".leaflet-tile-pane")).toBeTruthy();
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(0);
    expect(screen.getByTitle("Zoom in")).toBeTruthy();
  });

  it("adds the player marker only when coordinates are supplied", () => {
    const { rerender } = render(<MonumentMap monuments={[]} playerLocation={null} />);
    expect(screen.queryByTitle("Your location")).toBeNull();
    rerender(<MonumentMap monuments={[]} playerLocation={{ latitude: 40.75, longitude: -74 }} />);
    expect(screen.getByTitle("Your location")).toBeTruthy();
  });
});

it("handles missing data and skips invalid records without losing valid markers", () => {
  const { container, rerender } = render(<MonumentMap playerLocation={null} />);
  expect(container.querySelector(".leaflet-container")).toBeTruthy();
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(0);
  rerender(<MonumentMap monuments={[null, {}, { id: "bad", name: "Bad", latitude: 91, longitude: 0 }, ...mapMonuments]} playerLocation={null} />);
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
});

it("shows a non-blocking message for tile errors and keeps markers", () => {
  const { container } = render(<MonumentMap monuments={mapMonuments} playerLocation={null} />);
  const tile = container.querySelector("img.leaflet-tile");
  expect(tile).not.toBeNull();
  fireEvent.error(tile!);
  expect(screen.getByRole("status").textContent).toContain("Map tiles could not load");
  expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(9);
  fireEvent.click(screen.getByTitle("Washington Square Arch"));
  expect(container.querySelector(".leaflet-popup-content")?.textContent).toBe("Washington Square Arch");
});

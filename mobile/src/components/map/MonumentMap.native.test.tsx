import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { mapMonuments } from "../../data/mapMonuments";
import type { MapCoordinate } from "../../types/mapMonument";
import { MonumentMap } from "./MonumentMap";

// Test the props sent to the native SDK; rendering its actual map needs a device.
vi.mock("react-native-maps", () => ({
  default: ({ children }: PropsWithChildren) => <div data-testid="native-map">{children}</div>,
  Marker: ({ coordinate, title }: { coordinate: MapCoordinate; title: string }) => (
    <div title={title} data-testid="native-marker" data-latitude={coordinate.latitude} data-longitude={coordinate.longitude} />
  ),
}));
afterEach(cleanup);

it("passes every monument name and coordinate to a separate native marker", () => {
  render(<MonumentMap monuments={mapMonuments} playerLocation={null} />);
  expect(screen.getAllByTestId("native-marker")).toHaveLength(9);
  for (const monument of mapMonuments) {
    const marker = screen.getByTitle(monument.name);
    expect(marker.getAttribute("data-latitude")).toBe(String(monument.latitude));
    expect(marker.getAttribute("data-longitude")).toBe(String(monument.longitude));
  }
});

it("renders the native map with an empty list and no player location", () => {
  render(<MonumentMap monuments={[]} playerLocation={null} />);
  expect(screen.getByTestId("native-map")).toBeTruthy();
  expect(screen.queryAllByTestId("native-marker")).toHaveLength(0);
});

it("adds a native player marker after permission provides coordinates", () => {
  render(<MonumentMap monuments={[]} playerLocation={{ latitude: 40.75, longitude: -74 }} />);
  expect(screen.getByTitle("Your location").getAttribute("data-latitude")).toBe("40.75");
});

it("handles missing native map data and skips invalid monuments", () => {
  const { rerender } = render(<MonumentMap playerLocation={null} />);
  expect(screen.queryAllByTestId("native-marker")).toHaveLength(0);
  rerender(<MonumentMap monuments={[null, { id: "bad", name: "Bad", latitude: NaN, longitude: 0 }, ...mapMonuments]} playerLocation={null} />);
  expect(screen.getAllByTestId("native-marker")).toHaveLength(9);
});

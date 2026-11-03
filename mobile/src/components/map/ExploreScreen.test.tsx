import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import ExploreScreen from "../../../app/(tabs)/explore";

vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("../Screen", () => ({ Screen: ({ children }: PropsWithChildren) => <div>{children}</div> }));
vi.mock("./MonumentMap", () => import("./MonumentMap.web"));
vi.mock("../../location/requestPlayerLocation", () => import("../../location/requestPlayerLocation.web"));
afterEach(cleanup);

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

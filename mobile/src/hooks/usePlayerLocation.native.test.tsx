import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import * as Location from "expo-location";
import { usePlayerLocation } from "./usePlayerLocation";

vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: { Balanced: 3 },
}));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });

it("recovers from a native timeout and never replaces a retry's position with the late result", async () => {
  vi.useFakeTimers();
  vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: "granted" } as Location.LocationPermissionResponse);
  let finishOld!: (value: Location.LocationObject) => void;
  vi.mocked(Location.getCurrentPositionAsync).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  const { result } = renderHook(usePlayerLocation);
  await act(() => vi.advanceTimersByTimeAsync(15000));
  expect(result.current.loading).toBe(false);
  expect(result.current.location).toBeNull();
  expect(result.current.message).toContain("timed out");
  vi.mocked(Location.getCurrentPositionAsync).mockResolvedValueOnce({ coords: { latitude: 40.75, longitude: -74 } } as Location.LocationObject);
  await act(() => result.current.locate());
  await act(async () => { finishOld({ coords: { latitude: 1, longitude: 2 } } as Location.LocationObject); });
  expect(result.current.location).toEqual({ latitude: 40.75, longitude: -74 });
});

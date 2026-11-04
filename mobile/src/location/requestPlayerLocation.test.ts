import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Location from "expo-location";
import { requestPlayerLocation } from "./requestPlayerLocation";

vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: { Balanced: 3 },
}));

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.useRealTimers());
describe("native location permission", () => {
  it("does not read coordinates when foreground permission is denied", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: "denied" } as Location.LocationPermissionResponse);
    await expect(requestPlayerLocation()).rejects.toThrow("permission denied");
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
  it("returns coordinates after permission is granted", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: "granted" } as Location.LocationPermissionResponse);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({ coords: { latitude: 40.7, longitude: -74 } } as Location.LocationObject);
    await expect(requestPlayerLocation()).resolves.toEqual({ latitude: 40.7, longitude: -74 });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledBefore(vi.mocked(Location.getCurrentPositionAsync));
  });
  it("handles unavailable device location", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: "granted" } as Location.LocationPermissionResponse);
    vi.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error("GPS unavailable"));
    await expect(requestPlayerLocation()).rejects.toThrow("Location unavailable");
  });
});

it("times out, permits a retry, and ignores a late native result", async () => {
  vi.useFakeTimers();
  vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: "granted" } as Location.LocationPermissionResponse);
  let finishOld!: (value: Location.LocationObject) => void;
  vi.mocked(Location.getCurrentPositionAsync).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  const first = requestPlayerLocation();
  const failed = expect(first).rejects.toThrow("Location unavailable");
  await vi.advanceTimersByTimeAsync(15000);
  await failed;
  vi.mocked(Location.getCurrentPositionAsync).mockResolvedValueOnce({ coords: { latitude: 40.75, longitude: -74 } } as Location.LocationObject);
  const retry = await requestPlayerLocation();
  finishOld({ coords: { latitude: 1, longitude: 2 } } as Location.LocationObject);
  await Promise.resolve();
  expect(retry).toEqual({ latitude: 40.75, longitude: -74 });
  expect(vi.getTimerCount()).toBe(0);
});

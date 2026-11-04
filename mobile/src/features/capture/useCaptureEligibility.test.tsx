import { act, renderHook } from "@testing-library/react";
import * as Location from "expo-location";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureMonument } from "../../data/captureMonument";
import { LOCATION_REQUEST_TIMEOUT_MS, useCaptureEligibility } from "./useCaptureEligibility";

vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: { High: 6 },
}));

const grantedPermission = { status: "granted" } as Location.LocationPermissionResponse;

describe("capture eligibility location flow", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not request coordinates after location permission is denied", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      status: "denied",
    } as Location.LocationPermissionResponse);
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("permission-denied");
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("allows capture when an accurate position is inside the radius", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: captureMonument.latitude, longitude: captureMonument.longitude, accuracy: 8 },
      timestamp: Date.now(),
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("eligible");
    expect(result.current.state.distanceMeters).toBe(0);
  });

  it("blocks capture when the player is outside the radius", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 40.74, longitude: -74.01, accuracy: 10 },
      timestamp: Date.now(),
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("outside");
    expect(result.current.state.message).toContain("closer");
  });

  it("asks for a retry when the position is not accurate enough", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: captureMonument.latitude, longitude: captureMonument.longitude, accuracy: 80 },
      timestamp: Date.now(),
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("inaccurate");
    expect(result.current.state.message).toContain("retry");
  });

  it("handles unavailable location services without starting capture", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error("GPS unavailable"));
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("unavailable");
    expect(result.current.state.message).toContain("retry");
  });

  it("rejects a cached location even when its coordinates are inside the radius", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: captureMonument.latitude, longitude: captureMonument.longitude, accuracy: 8 },
      timestamp: Date.now() - 60_000,
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("stale");
    expect(result.current.state.message).toContain("too old");
  });

  it("times out a hanging location request and restores retry state", async () => {
    vi.useFakeTimers();
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useCaptureEligibility(captureMonument));

    await act(async () => {
      const verification = result.current.verify();
      await vi.advanceTimersByTimeAsync(LOCATION_REQUEST_TIMEOUT_MS);
      await verification;
    });

    expect(result.current.state.status).toBe("unavailable");
    expect(result.current.state.message).toContain("timed out");
    vi.useRealTimers();
  });
});

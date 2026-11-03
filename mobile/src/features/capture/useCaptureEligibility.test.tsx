import { act, renderHook } from "@testing-library/react";
import * as Location from "expo-location";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { demo, getDemoState, __setDemoStateForTests } from "../../demo/store";
import { createSeedState } from "../../demo/seed";
import { useCaptureEligibility } from "./useCaptureEligibility";

vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: { High: 6 },
}));

const arch = { latitude: 40.7312, longitude: -73.9971 };
const grantedPermission = { status: "granted" } as Location.LocationPermissionResponse;

describe("capture eligibility location flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __setDemoStateForTests(createSeedState(Date.now()));
  });

  it("does not request coordinates after location permission is denied", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      status: "denied",
    } as Location.LocationPermissionResponse);
    const { result } = renderHook(() => useCaptureEligibility("washington-arch", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("permission-denied");
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("allows capture when an accurate position is inside the radius", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: arch.latitude, longitude: arch.longitude, accuracy: 8 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility("washington-arch", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("eligible");
    expect(result.current.state.distanceMeters).toBe(0);
  });

  it("blocks capture when the player is outside the radius", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 40.74, longitude: -74.01, accuracy: 10 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility("washington-arch", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("outside");
    expect(result.current.state.message).toContain("closer");
  });

  it("asks for a retry when the position is not accurate enough", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: arch.latitude, longitude: arch.longitude, accuracy: 80 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility("washington-arch", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("inaccurate");
    expect(result.current.state.message).toContain("retry");
  });

  it("handles unavailable location services without starting capture", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error("GPS unavailable"));
    const { result } = renderHook(() => useCaptureEligibility("washington-arch", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("unavailable");
    expect(result.current.state.message).toContain("retry");
  });

  it("blocks capture of a monument that is still locked to another player", async () => {
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(grantedPermission);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 40.7744, longitude: -73.9703, accuracy: 8 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useCaptureEligibility("bethesda", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("locked");
    expect(result.current.state.message).toContain("Sam Chen");
  });

  it("uses the simulated position from Demo tools without asking the device", async () => {
    demo.setLocation({ mode: "simulated", ...arch, accuracyMeters: 5, label: "test" });
    const { result } = renderHook(() => useCaptureEligibility("washington-arch", "u-priya"));

    await act(() => result.current.verify());

    expect(result.current.state.status).toBe("eligible");
    expect(result.current.checked?.simulated).toBe(true);
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(getDemoState().settings.location.mode).toBe("simulated");
  });
});

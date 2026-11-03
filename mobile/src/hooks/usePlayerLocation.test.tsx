import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerLocation } from "./usePlayerLocation";

vi.mock("../location/requestPlayerLocation", () => import("../location/requestPlayerLocation.web"));
const getCurrentPosition = vi.fn();
beforeEach(() => {
  getCurrentPosition.mockReset();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
});
afterEach(cleanup);

describe("player location in the browser", () => {
  it("requests location on mount only once, including Strict Mode and re-renders", async () => {
    getCurrentPosition.mockImplementation((success) => success({ coords: { latitude: 40.75, longitude: -74 } }));
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const { result, rerender } = renderHook(usePlayerLocation, { wrapper });
    await waitFor(() => expect(result.current.location).toEqual({ latitude: 40.75, longitude: -74 }));
    rerender();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it.each([[1, "permission denied"], [2, "unavailable"], [3, "unavailable"]])(
    "handles geolocation error %i without crashing", async (code, message) => {
      getCurrentPosition.mockImplementation((_success, failure) => failure({ code }));
      const { result } = renderHook(usePlayerLocation);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.location).toBeNull();
      expect(result.current.message).toContain(message);
      expect(result.current.message).toContain("still explore");
    },
  );

  it("handles a browser without geolocation", async () => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    const { result } = renderHook(usePlayerLocation);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toBeNull();
    expect(result.current.message).toContain("unavailable");
  });

  it("allows a manual retry after denial", async () => {
    getCurrentPosition.mockImplementationOnce((_success, failure) => failure({ code: 1 }))
      .mockImplementationOnce((success) => success({ coords: { latitude: 40.7, longitude: -74 } }));
    const { result } = renderHook(usePlayerLocation);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.locate());
    expect(result.current.location).toEqual({ latitude: 40.7, longitude: -74 });
  });

  it("clears previously successful coordinates when a retry fails", async () => {
    getCurrentPosition.mockImplementationOnce((success) => success({ coords: { latitude: 40.7, longitude: -74 } }))
      .mockImplementationOnce((_success, failure) => failure({ code: 2 }));
    const { result } = renderHook(usePlayerLocation);
    await waitFor(() => expect(result.current.location).not.toBeNull());
    await act(() => result.current.locate());
    expect(result.current.location).toBeNull();
    expect(result.current.message).toContain("unavailable");
    expect(result.current.loading).toBe(false);
  });

  it("does not display invalid player coordinates", async () => {
    getCurrentPosition.mockImplementation((success) => success({ coords: { latitude: NaN, longitude: -74 } }));
    const { result } = renderHook(usePlayerLocation);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.location).toBeNull();
    expect(result.current.message).toContain("unavailable");
  });
});

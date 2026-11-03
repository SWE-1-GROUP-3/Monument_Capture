import { act, cleanup, renderHook } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useStatusTime } from "./useStatusTime";

const state = vi.hoisted(() => ({ focused: true, currentState: "active", listener: undefined as undefined | ((state: string) => void), remove: vi.fn() }));
vi.mock("expo-router", () => ({ useFocusEffect: (callback: () => (() => void)) => {
  useEffect(() => state.focused ? callback() : undefined, [callback, state.focused]);
} }));
vi.mock("react-native", () => ({ AppState: {
  get currentState() { return state.currentState; },
  addEventListener: (_event: string, listener: (state: string) => void) => {
    state.listener = listener;
    return { remove: state.remove };
  },
} }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  state.focused = true;
  state.currentState = "active";
  state.remove.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shares one ticking clock and cleans up on unmount", () => {
  const { result, unmount } = renderHook(useStatusTime);
  expect(result.current).toBe(10_000);
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(11_000);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(state.remove).toHaveBeenCalledTimes(1);
});

it("stops in background and refreshes immediately on foreground without duplicate timers", () => {
  const { result } = renderHook(useStatusTime);
  act(() => state.listener!("background"));
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current).toBe(10_000);
  act(() => state.listener!("active"));
  expect(result.current).toBe(15_000);
  act(() => state.listener!("active"));
  expect(vi.getTimerCount()).toBe(1);
});

it("cleans up on blur and refreshes immediately when Explore is focused again", () => {
  const { result, rerender } = renderHook(useStatusTime);
  state.focused = false;
  rerender();
  expect(vi.getTimerCount()).toBe(0);
  expect(state.remove).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(5000));
  state.focused = true;
  rerender();
  expect(result.current).toBe(15_000);
  expect(vi.getTimerCount()).toBe(1);
});

it("does not start a timer when initially unfocused or inactive", () => {
  state.focused = false;
  const { rerender } = renderHook(useStatusTime);
  expect(vi.getTimerCount()).toBe(0);
  state.currentState = "background";
  state.focused = true;
  rerender();
  expect(vi.getTimerCount()).toBe(0);
});

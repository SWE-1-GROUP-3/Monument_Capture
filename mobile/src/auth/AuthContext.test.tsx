import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { __setDemoStateForTests } from "../demo/store";
import { createSeedState, DEMO_PASSWORD } from "../demo/seed";
import { useAuth } from "./AuthContext";

describe("US-01 mock login", () => {
  beforeEach(() => __setDemoStateForTests(createSeedState(Date.now())));

  it("logs in with a known email and the demo password", async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
    let ok = false;
    await act(async () => { ok = await result.current.login("  Demo@Example.com ", DEMO_PASSWORD); });
    expect(ok).toBe(true);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.role).toBe("player");
  });

  it("rejects a wrong password and an unknown email", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      expect(await result.current.login("demo@example.com", "wrong")).toBe(false);
      expect(await result.current.login("nobody@example.com", DEMO_PASSWORD)).toBe(false);
    });
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("signs moderators in with the moderator role, and logs out", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.login("mod@demo.test", DEMO_PASSWORD); });
    expect(result.current.user?.role).toBe("moderator");
    act(() => result.current.logout());
    expect(result.current.isLoggedIn).toBe(false);
  });
});

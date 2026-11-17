import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { __setDemoStateForTests, getDemoState } from "../demo/store";
import { createSeedState } from "../demo/seed";
import { AuthProvider, useAuth } from "./AuthContext";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn(),
  onAuthStateChange: vi.fn(), startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn(),
  clear: vi.fn(), me: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" }, AppState: {} }));
vi.mock("./supabase", () => ({ getSupabaseClient: () => ({ auth: mocks }), clearLocalSession: () => mocks.clear() }));
vi.mock("../api/client", () => ({ loadCurrentUser: (...args: unknown[]) => mocks.me(...args) }));
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const session = { access_token: "test-access-token" };
const player = { id: "internal-player", name: "Alex", email: "alex@example.com", role: "player" };
let event: (name: string, session: unknown) => void;

beforeEach(() => {
  vi.resetAllMocks();
  __setDemoStateForTests(createSeedState(Date.now()));
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.onAuthStateChange.mockImplementation(callback => { event = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
  mocks.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.me.mockResolvedValue(player);
});
afterEach(cleanup);

async function ready() {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("Supabase login", () => {
  it("uses provider password login then the backend's provisioned identity", async () => {
    const { result } = await ready();
    await act(async () => { expect(await result.current.login(" Alex@Example.Com ", "secret")).toBe(true); });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "alex@example.com", password: "secret" });
    expect(mocks.me).toHaveBeenCalledWith("test-access-token");
    expect(result.current.user).toEqual(player);
    expect(getDemoState().sessionUserId).toBe("internal-player");
  });
  it("rejects provider credentials without accepting a local account", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: new Error("bad"), data: { session: null } });
    const { result } = await ready();
    await act(async () => { expect(await result.current.login("alex@monument.local", "local123")).toBe(false); });
    expect(result.current.isLoggedIn).toBe(false);
    expect(mocks.me).not.toHaveBeenCalled();
  });
  it("requires a provisioned backend identity", async () => {
    mocks.me.mockRejectedValue(new Error("Account access has not been provisioned."));
    const { result } = await ready();
    await act(async () => { expect(await result.current.login("alex@example.com", "secret")).toBe(false); });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.error).toContain("provisioned");
  });
  it("restores a session only after backend verification", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    const { result } = await ready();
    expect(result.current.isLoggedIn).toBe(true);
  });
  it("clears local credentials even when remote logout fails", async () => {
    mocks.signOut.mockResolvedValue({ error: new Error("offline") });
    const { result } = await ready();
    await act(async () => { await result.current.login("alex@example.com", "secret"); });
    await act(async () => { await result.current.logout(); });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.error).toContain("Remote logout");
    expect(mocks.clear).toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not restore an account from a delayed /me response after signout", async () => {
    const { result } = await ready();
    let resolve!: (user: unknown) => void;
    mocks.me.mockImplementation(() => new Promise(r => { resolve = r; }));
    act(() => { event("TOKEN_REFRESHED", session); });
    await act(async () => { await result.current.logout(); });
    await act(async () => { resolve(player); });
    expect(result.current.isLoggedIn).toBe(false);
  });
});

it("does not sign in from a delayed provider response after logout", async () => {
  const { result } = await ready();
  let resolve!: (value: unknown) => void;
  mocks.signInWithPassword.mockImplementation(() => new Promise(r => { resolve = r; }));
  let attempt!: Promise<boolean>;
  act(() => { attempt = result.current.login("alex@example.com", "secret"); });
  await act(async () => { await result.current.logout(); });
  await act(async () => { resolve({ data: { session }, error: null }); expect(await attempt).toBe(false); });
  expect(result.current.isLoggedIn).toBe(false);
});

it("waits for logout cleanup before allowing a new login", async () => {
  const { result } = await ready();
  let finish!: (value: unknown) => void;
  mocks.signOut.mockImplementation(() => new Promise(r => { finish = r; }));
  let signingOut!: Promise<void>;
  act(() => { signingOut = result.current.logout(); });
  await act(async () => { expect(await result.current.login("alex@example.com", "secret")).toBe(false); });
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  await act(async () => { finish({ error: null }); await signingOut; });
  await act(async () => { expect(await result.current.login("alex@example.com", "secret")).toBe(true); });
});

import { beforeEach, expect, it, vi } from "vitest";
import { sessionStorage } from "./sessionStorage";
const storage = vi.hoisted(() => new Map<string,string>());
const writes = vi.hoisted(() => ({ fail: false }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => storage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (writes.fail && key.endsWith(".0")) throw new Error("keychain unavailable");
    storage.set(key,value);
  },
  deleteItemAsync: async (key: string) => { storage.delete(key); },
}));
beforeEach(() => { storage.clear(); writes.fail = false; });
it("round-trips large Unicode sessions in small secure chunks and removes them", async () => {
  const value = "🗽".repeat(5000);
  await sessionStorage.setItem("auth",value);
  expect(await sessionStorage.getItem("auth")).toBe(value);
  for (const [key,part] of storage) if (key !== "auth") expect(new TextEncoder().encode(part).length).toBeLessThan(2048);
  await sessionStorage.removeItem("auth");
  expect(storage.size).toBe(0);
});
it("keeps the previous complete session after a failed replacement", async () => {
  await sessionStorage.setItem("auth","previous");
  writes.fail = true;
  await expect(sessionStorage.setItem("auth","new")).rejects.toThrow("keychain");
  expect(await sessionStorage.getItem("auth")).toBe("previous");
});

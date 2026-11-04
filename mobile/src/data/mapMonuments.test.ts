import { afterEach, expect, it, vi } from "vitest";
import { getMonumentAvailability } from "../utils/monumentAvailability";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

it("initializes the approved demo states once and preserves timestamps on later imports", async () => {
  vi.useFakeTimers();
  const initializedAt = Date.parse("2026-11-03T15:00:00.000Z");
  vi.setSystemTime(initializedAt);
  vi.resetModules();
  const { mapMonuments } = await import("./mapMonuments");

  expect(mapMonuments).toHaveLength(9);
  for (const monument of mapMonuments) {
    expect(monument.captureRadiusMeters).toBe(100);
  }
  const active = mapMonuments.find(m => m.id === "washington-arch")!;
  const expired = mapMonuments.find(m => m.id === "soldiers-sailors")!;
  expect(active.hold).toEqual({ holderDisplayName: "Demo Player A", lockExpiresAt: "2026-11-03T18:00:00.000Z" });
  expect(expired.hold).toEqual({ holderDisplayName: "Demo Player B", lockExpiresAt: "2026-11-03T14:55:00.000Z" });
  expect(getMonumentAvailability(active, initializedAt)).toEqual({
    status: "locked", holderDisplayName: "Demo Player A", remainingMs: 10_800_000,
  });
  expect(getMonumentAvailability(expired, initializedAt)).toEqual({ status: "available" });
  const unheld = mapMonuments.filter(m => m.id !== active.id && m.id !== expired.id);
  expect(unheld).toHaveLength(7);
  for (const monument of unheld) {
    expect(monument.hold).toBeNull();
    expect(getMonumentAvailability(monument, initializedAt)).toEqual({ status: "available" });
  }

  vi.setSystemTime(initializedAt + 10 * 60_000);
  const later = await import("./mapMonuments");
  expect(later.mapMonuments).toBe(mapMonuments);
  expect(active.hold!.lockExpiresAt).toBe("2026-11-03T18:00:00.000Z");
  expect(expired.hold!.lockExpiresAt).toBe("2026-11-03T14:55:00.000Z");
});

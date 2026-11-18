import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSeedState } from "../demo/seed";
import { __setDemoStateForTests } from "../demo/store";
import { decideRefusalMessage, game, startRefusalMessage } from "./game";
import { __setSupabaseForTests } from "./supabaseClient";

vi.mock("./config", () => ({
  backendMode: "supabase",
  devToolsEnabled: false,
  supabaseUrl: "https://example.supabase.co",
  supabasePublishableKey: "sb_publishable_test",
}));

const emptyState = { server_now: new Date().toISOString(), monuments: [], my_captures: [] };
const position = { latitude: 40.7745, longitude: -73.9703, accuracyMeters: 8, timestampMs: Date.now() };

function fakeRpc(replies: Record<string, unknown>) {
  const rpc = vi.fn(async (name: string) => ({ data: name in replies ? replies[name] : emptyState, error: null }));
  __setSupabaseForTests({ rpc } as unknown as SupabaseClient);
  return rpc;
}

describe("game actions against Supabase", () => {
  beforeEach(() => __setDemoStateForTests({ ...createSeedState(Date.now()), monuments: [] }));
  afterEach(() => __setSupabaseForTests(null));

  it("start sends only the monument and the reported position; identity and distance are the server's", async () => {
    const rpc = fakeRpc({ start_capture: { ok: true, capture: { id: "c1" } } });
    const result = await game.startCapture("m1", position, false);
    expect(result).toEqual({ ok: true, captureId: "c1" });
    expect(rpc).toHaveBeenCalledWith("start_capture", {
      p_monument_id: "m1", p_latitude: 40.7745, p_longitude: -73.9703, p_accuracy_m: 8,
    });
    expect(rpc).toHaveBeenCalledWith("get_game_state");
  });

  it("explains a refusal using what the server measured", async () => {
    fakeRpc({ start_capture: { ok: false, code: "too_far", distance_m: 150, radius_m: 100 } });
    expect(await game.startCapture("m1", position, false)).toEqual({
      ok: false, code: "too_far", message: "You are about 150 m away. Move 50 m closer and retry.",
    });
  });

  it("cancel calls cancel_capture and refreshes", async () => {
    const rpc = fakeRpc({ cancel_capture: true });
    expect(await game.cancelCapture("c1")).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("cancel_capture", { p_capture_id: "c1" });
  });

  it("turns a network failure into a readable message", async () => {
    __setSupabaseForTests({ rpc: vi.fn(async () => { throw new TypeError("Failed to fetch"); }) } as unknown as SupabaseClient);
    const result = await game.startCapture("m1", position, false);
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/Can't reach/) });
  });
});

// A 1x1 JPEG as a data URL, like the camera produces.
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

function fakeStorageClient(uploadError: { message: string } | null, submitReply: unknown) {
  const upload = vi.fn(async () => ({ data: uploadError ? null : { path: "p" }, error: uploadError }));
  const from = vi.fn(() => ({ upload }));
  const rpc = vi.fn(async (name: string) => ({ data: name === "submit_capture" ? submitReply : emptyState, error: null }));
  __setSupabaseForTests({ rpc, storage: { from } } as unknown as SupabaseClient);
  return { upload, from, rpc };
}

describe("submitting a capture against Supabase", () => {
  beforeEach(() => __setDemoStateForTests({ ...createSeedState(Date.now()), monuments: [], sessionUserId: "u1" }));
  afterEach(() => __setSupabaseForTests(null));

  it("uploads the JPEG to the server-decided path without overwrite, then submits", async () => {
    const { upload, from, rpc } = fakeStorageClient(null, { ok: true });
    expect(await game.submitCapture("c1", JPEG)).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("capture-photos");
    expect(upload).toHaveBeenCalledWith("u1/c1.jpg", expect.anything(), { contentType: "image/jpeg", upsert: false });
    expect((upload.mock.calls[0] as unknown as [string, Blob])[1].type).toBe("image/jpeg");
    expect(rpc).toHaveBeenCalledWith("submit_capture", { p_capture_id: "c1" });
  });

  it("a retry finds the photo already uploaded and still submits", async () => {
    const { rpc } = fakeStorageClient({ message: "The resource already exists" }, { ok: true });
    expect(await game.submitCapture("c1", JPEG)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("submit_capture", { p_capture_id: "c1" });
  });

  it("an upload refused by Storage policy means the check-in expired", async () => {
    const { rpc } = fakeStorageClient({ message: "new row violates row-level security policy" }, { ok: true });
    const result = await game.submitCapture("c1", JPEG);
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/expired/) });
    expect(rpc).not.toHaveBeenCalledWith("submit_capture", expect.anything());
  });

  it("explains the server's refusal", async () => {
    fakeStorageClient(null, { ok: false, code: "not_in_progress" });
    expect(await game.submitCapture("c1", JPEG)).toEqual({
      ok: false, code: "not_in_progress", message: "This capture was already submitted or cancelled.",
    });
  });

  it("refuses anything that isn't a JPEG before uploading", async () => {
    const { upload } = fakeStorageClient(null, { ok: true });
    const result = await game.submitCapture("c1", "data:image/png;base64,iVBORw0KGgo=");
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("moderator decisions against Supabase", () => {
  beforeEach(() => __setDemoStateForTests({ ...createSeedState(Date.now()), monuments: [] }));
  afterEach(() => __setSupabaseForTests(null));

  it("sends the decision and reason to decide_capture, then refreshes", async () => {
    const rpc = fakeRpc({ decide_capture: { ok: true, decision: "approved" } });
    expect(await game.decideCapture("c1", "approved", "")).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("decide_capture", { p_capture_id: "c1", p_decision: "approved", p_reason: "" });
    expect(rpc).toHaveBeenCalledWith("get_game_state");
  });

  it("explains when another moderator got there first", async () => {
    fakeRpc({ decide_capture: { ok: false, code: "already_held", holder_name: "Grace", locked_until: new Date(Date.now() + 30 * 60_000).toISOString() } });
    const result = await game.decideCapture("c2", "approved", "");
    expect(result).toMatchObject({ ok: false, code: "already_held", message: expect.stringMatching(/^This monument is already held by Grace for another 3\d min\. Reject this capture instead\.$/) });
  });

  it.each([
    ["reason_required", "A reason is required to reject a capture."],
    ["already_decided", "Another moderator has already decided this capture."],
  ])("%s", (code, message) => {
    expect(decideRefusalMessage({ ok: false, code })).toBe(message);
  });
});

describe("monument management against Supabase", () => {
  beforeEach(() => __setDemoStateForTests({ ...createSeedState(Date.now()), monuments: [] }));
  afterEach(() => __setSupabaseForTests(null));
  const input = { name: "Hamilton", neighborhood: "Central Park", description: "", latitude: 40.78, longitude: -73.963, captureRadiusMeters: 100 };

  it("adds through save_monument and returns the new id", async () => {
    const rpc = fakeRpc({ save_monument: { ok: true, monument_id: "m9" } });
    expect(await game.saveMonument(input)).toEqual({ ok: true, monumentId: "m9" });
    expect(rpc).toHaveBeenCalledWith("save_monument", expect.objectContaining({ p_id: null, p_name: "Hamilton", p_capture_radius_m: 100 }));
  });

  it("checks the form before calling the server", async () => {
    const rpc = fakeRpc({});
    expect(await game.saveMonument({ ...input, latitude: 123 })).toEqual({ ok: false, message: "Latitude must be between -90 and 90." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("toggles a monument with set_monument_active", async () => {
    const rpc = fakeRpc({ set_monument_active: { ok: true } });
    expect(await game.setMonumentActive("m1", false)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("set_monument_active", { p_id: "m1", p_active: false });
  });
});

describe("ending a hold against Supabase", () => {
  beforeEach(() => __setDemoStateForTests({ ...createSeedState(Date.now()), monuments: [] }));
  afterEach(() => __setSupabaseForTests(null));

  it("calls release_hold with the reason, then refreshes", async () => {
    const rpc = fakeRpc({ release_hold: { ok: true, holder_name: "test1" } });
    expect(await game.releaseHold("m1", "Screenshot")).toEqual({ ok: true, holderName: "test1" });
    expect(rpc).toHaveBeenCalledWith("release_hold", { p_monument_id: "m1", p_reason: "Screenshot" });
    expect(rpc).toHaveBeenCalledWith("get_game_state");
  });

  it("needs a reason before calling the server", async () => {
    const rpc = fakeRpc({});
    expect(await game.releaseHold("m1", " ")).toEqual({ ok: false, message: "A reason is required to end a hold." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains when the hold already ended", async () => {
    fakeRpc({ release_hold: { ok: false, code: "not_held" } });
    expect(await game.releaseHold("m1", "Screenshot")).toEqual({ ok: false, code: "not_held", message: "This monument isn't held right now." });
  });
});

describe("refusal messages", () => {
  const now = Date.parse("2026-11-18T01:00:00Z");
  it.each([
    [{ code: "inaccurate", max_accuracy_m: 50 }, "Your GPS signal is not accurate enough (needs 50 m or better). Move to an open area and retry."],
    [{ code: "held", holder_name: "Grace", locked_until: "2026-11-18T01:35:00Z" }, "Held by Grace for another 35 min. Come back when the lock expires."],
    [{ code: "held_by_you", locked_until: "2026-11-18T02:00:00Z" }, "Held by you for another 1 h. Come back when the lock expires."],
    [{ code: "already_pending" }, "You already have a capture of this monument waiting for review."],
    [{ code: "monument_unavailable" }, "This monument is not available for capture."],
    [{ code: "something_new" }, "The capture couldn't be started. Try again."],
  ])("%o", (refusal, message) => {
    expect(startRefusalMessage({ ok: false, ...refusal }, now)).toBe(message);
  });
});

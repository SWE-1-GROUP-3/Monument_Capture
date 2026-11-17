import { beforeEach, describe, expect, it } from "vitest";
import { cancelCapture, getHistoryFor, getPendingQueue, saveDraftPhoto, startCapture, submitCapturePhoto } from "./rules";
import { createSeedState } from "./seed";
import { __setDemoStateForTests, demo, getDemoState, setAuthenticatedUser } from "./store";
const position = () => ({ latitude: 40.7312, longitude: -73.9971, accuracyMeters: 8, timestampMs: Date.now() });
const start = (state = createSeedState(Date.now()), playerId = "u-alex", monumentId = "washington-arch") =>
  startCapture(state, { playerId, monumentId, position: position() }, Date.now());

describe("account/monument drafts", () => {
  beforeEach(() => __setDemoStateForTests(createSeedState(Date.now())));
  it("resumes the same photo without creating a capture, history or review entry", () => {
    const first = start();
    const withPhoto = saveDraftPhoto(first.state, first.capture.id, "file://photo");
    const reopened = start(withPhoto);
    expect(reopened.capture).toMatchObject({ id: first.capture.id, photoUri: "file://photo" });
    expect(reopened.state.drafts).toHaveLength(1);
    expect(reopened.state.captures).toHaveLength(0);
    expect(getHistoryFor(reopened.state, "u-alex")).toHaveLength(0);
    expect(getPendingQueue(reopened.state)).toHaveLength(0);
  });
  it("keeps other monuments and accounts separate", () => {
    const a = start();
    const b = start(a.state, "u-sam");
    const other = startCapture(b.state, { playerId: "u-alex", monumentId: "farragut",
      position: { ...position(), latitude: 40.7426, longitude: -73.9878 } }, Date.now());
    expect(other.state.drafts).toHaveLength(3);
    expect(start(other.state).capture.id).toBe(a.capture.id);
  });
  it("preserves a saved draft after failed submission and removes it after success/discard", () => {
    const a = start();
    const saved = saveDraftPhoto(a.state, a.capture.id, "file://photo");
    expect(() => submitCapturePhoto(saved, a.capture.id, "file://photo", Date.now(), { ...position(), accuracyMeters: 200 })).toThrow("GPS");
    expect(saved.drafts[0]?.photoUri).toBe("file://photo");
    expect(saved.captures).toHaveLength(0);
    const success = submitCapturePhoto(saved, a.capture.id, "file://photo", Date.now(), position());
    expect(success.drafts).toHaveLength(0);
    expect(success.captures[0]?.status).toBe("pending");
    expect(cancelCapture(saved, a.capture.id).drafts).toHaveLength(0);
  });
  it("prevents another signed-in account from changing or submitting a draft", () => {
    setAuthenticatedUser(getDemoState().users.find(u => u.id === "u-alex")!);
    const draft = demo.startCapture("washington-arch", "u-alex", position());
    demo.saveDraftPhoto(draft.id, "file://photo");
    demo.logout();
    setAuthenticatedUser(getDemoState().users.find(u => u.id === "u-sam")!);
    expect(() => demo.saveDraftPhoto(draft.id, "other")).toThrow("another account");
    expect(() => demo.submitPhoto(draft.id, "other", position())).toThrow("another account");
    expect(() => demo.cancelCapture(draft.id)).toThrow("another account");
    expect(getDemoState().drafts[0]?.photoUri).toBe("file://photo");
  });
});

// Every change a player or moderator makes to the game goes through here.
//
// Local mode: the original rules in the browser (demo/store.ts).
// Supabase mode: a Postgres function called with rpc(); the server decides,
// then the app re-reads the game state. The client never writes a table.
//
// Screens only ever see { ok: true, ... } or { ok: false, message }.

import { formatDistance, formatRemaining, type MonumentInput, RuleError, validateMonument } from "../demo/rules";
import { demo, demoNow, getDemoState } from "../demo/store";
import type { PlayerPosition } from "../features/capture/types";
import { backendMode } from "./config";
import { refreshMap } from "./mapSync";
import { getSupabase } from "./supabaseClient";

export type Failure = { ok: false; message: string; code?: string };
export type Result<T extends object = object> = ({ ok: true } & T) | Failure;

const OFFLINE = "Can't reach the game server. Check your connection and try again.";

function failure(e: unknown, fallback: string): Failure {
  if (e instanceof RuleError) return { ok: false, message: e.message };
  if (e instanceof Error && /fetch|network/i.test(e.message)) return { ok: false, message: OFFLINE };
  return { ok: false, message: e instanceof Error && e.message ? e.message : fallback };
}

// ---------------------------------------------------------------------------
// Messages for the server's refusal codes
// ---------------------------------------------------------------------------

type StartRefusal = {
  ok: false;
  code: string;
  distance_m?: number;
  radius_m?: number;
  accuracy_m?: number;
  max_accuracy_m?: number;
  holder_name?: string;
  locked_until?: string;
};

export function startRefusalMessage(r: StartRefusal, now = demoNow()): string {
  switch (r.code) {
    case "not_a_player":
      return "Only players capture monuments.";
    case "monument_unavailable":
      return "This monument is not available for capture.";
    case "bad_position":
      return "Your location couldn't be read. Retry for a current location.";
    case "inaccurate":
      return `Your GPS signal is not accurate enough (needs ${r.max_accuracy_m ?? 50} m or better). Move to an open area and retry.`;
    case "too_far": {
      const d = r.distance_m ?? 0;
      const closer = Math.max(1, d - (r.radius_m ?? 0));
      return `You are about ${formatDistance(d)} away. Move ${formatDistance(closer)} closer and retry.`;
    }
    case "held":
    case "held_by_you": {
      const left = r.locked_until ? formatRemaining(Date.parse(r.locked_until) - now) : "a while";
      const who = r.code === "held_by_you" ? "you" : (r.holder_name ?? "another player");
      return `Held by ${who} for another ${left}. Come back when the lock expires.`;
    }
    case "already_pending":
      return "You already have a capture of this monument waiting for review.";
    default:
      return "The capture couldn't be started. Try again.";
  }
}

export function submitRefusalMessage(code: string): string {
  switch (code) {
    case "expired":
      return "Your check-in expired before the photo was submitted. Check in again at the monument.";
    case "not_in_progress":
      return "This capture was already submitted or cancelled.";
    case "not_found":
      return "This capture no longer exists. Check in again at the monument.";
    case "photo_missing":
      return "The photo didn't finish uploading. Try submitting again.";
    default:
      return "The capture couldn't be submitted. Try again.";
  }
}

type DecideRefusal = { ok: false; code: string; holder_name?: string; locked_until?: string; status?: string };

export function decideRefusalMessage(r: DecideRefusal, now = demoNow()): string {
  switch (r.code) {
    case "reason_required":
      return "A reason is required to reject a capture.";
    case "already_held": {
      const left = r.locked_until ? ` for another ${formatRemaining(Date.parse(r.locked_until) - now)}` : "";
      return `This monument is already held${r.holder_name ? ` by ${r.holder_name}` : ""}${left}. Reject this capture instead.`;
    }
    case "already_decided":
      return "Another moderator has already decided this capture.";
    case "not_a_moderator":
      return "Only moderators can review captures.";
    case "own_capture":
      return "You can't review your own capture.";
    case "not_found":
      return "This capture no longer exists.";
    default:
      return "The decision couldn't be saved. Try again.";
  }
}

const MONUMENT_REFUSALS: Record<string, string> = {
  not_a_moderator: "Only moderators can manage monuments.",
  bad_name: "Name is required.",
  bad_latitude: "Latitude must be between -90 and 90.",
  bad_longitude: "Longitude must be between -180 and 180.",
  bad_radius: "Capture radius must be between 10 and 500 meters.",
  not_found: "This monument no longer exists.",
};

const RELEASE_REFUSALS: Record<string, string> = {
  not_a_moderator: "Only moderators can end a hold.",
  reason_required: "A reason is required to end a hold.",
  not_held: "This monument isn't held right now.",
  not_found: "This monument no longer exists.",
};

export const PHOTO_BUCKET = "capture-photos";

/** Where a capture's photo must be uploaded; the server only accepts this path. */
export function capturePhotoPath(playerId: string, captureId: string) {
  return `${playerId}/${captureId}.jpg`;
}

/** A photo from the camera or picker (a JPEG data URL) as an uploadable file. */
export async function photoToJpegBlob(photoUri: string): Promise<Blob> {
  const blob = await (await fetch(photoUri)).blob();
  if (blob.type !== "image/jpeg") {
    throw new Error("That photo couldn't be prepared for upload. Take it again with the camera.");
  }
  return blob;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const game = {
  /** Checks in at a monument. The server computes the distance and decides. */
  async startCapture(
    monumentId: string,
    position: PlayerPosition,
    simulated: boolean,
  ): Promise<Result<{ captureId: string }>> {
    if (backendMode === "local") {
      try {
        const user = getDemoState().sessionUserId;
        if (!user) return { ok: false, message: "Sign in first." };
        const capture = demo.startCapture(monumentId, user, position, simulated);
        return { ok: true, captureId: capture.id };
      } catch (e) {
        return failure(e, "Could not start the capture.");
      }
    }
    try {
      const { data, error } = await getSupabase().rpc("start_capture", {
        p_monument_id: monumentId,
        p_latitude: position.latitude,
        p_longitude: position.longitude,
        p_accuracy_m: position.accuracyMeters,
      });
      if (error) throw new Error(error.message);
      const reply = data as { ok: true; capture: { id: string } } | StartRefusal;
      await refreshMap({ afterCurrent: true });
      if (!reply.ok) return { ok: false, code: reply.code, message: startRefusalMessage(reply) };
      return { ok: true, captureId: reply.capture.id };
    } catch (e) {
      return failure(e, "Could not start the capture.");
    }
  },

  /**
   * Uploads the photo straight to Storage (the bytes never pass through a
   * function), then asks the server to submit the capture for review. The
   * server checks the photo is really there before accepting.
   */
  async submitCapture(captureId: string, photoUri: string): Promise<Result> {
    if (backendMode === "local") {
      try {
        demo.submitPhoto(captureId, photoUri);
        return { ok: true };
      } catch (e) {
        return failure(e, "Could not submit the capture.");
      }
    }
    const playerId = getDemoState().sessionUserId;
    if (!playerId) return { ok: false, message: "Sign in first." };
    try {
      const client = getSupabase();
      const blob = await photoToJpegBlob(photoUri);
      const upload = await client.storage
        .from(PHOTO_BUCKET)
        .upload(capturePhotoPath(playerId, captureId), blob, { contentType: "image/jpeg", upsert: false });
      // A retry after a failed submit finds the photo already there: that's fine.
      if (upload.error && !/exists|duplicate/i.test(upload.error.message)) {
        throw new Error(
          /row-level security|unauthori[sz]ed|403/i.test(upload.error.message)
            ? submitRefusalMessage("expired")
            : upload.error.message,
        );
      }
      const { data, error } = await client.rpc("submit_capture", { p_capture_id: captureId });
      if (error) throw new Error(error.message);
      const reply = data as { ok: true } | { ok: false; code: string };
      await refreshMap({ afterCurrent: true });
      if (!reply.ok) return { ok: false, code: reply.code, message: submitRefusalMessage(reply.code) };
      return { ok: true };
    } catch (e) {
      return failure(e, "Could not submit the capture.");
    }
  },

  /**
   * A moderator approves or rejects a pending capture. On the server this is
   * one transaction that locks the monument first, so two moderators can
   * never produce two holders.
   */
  async decideCapture(captureId: string, decision: "approved" | "rejected", reason: string): Promise<Result> {
    if (backendMode === "local") {
      try {
        const moderator = getDemoState().sessionUserId;
        if (!moderator) return { ok: false, message: "Sign in first." };
        demo.review(captureId, moderator, decision, reason);
        return { ok: true };
      } catch (e) {
        return failure(e, "Could not save the decision.");
      }
    }
    try {
      const { data, error } = await getSupabase().rpc("decide_capture", {
        p_capture_id: captureId,
        p_decision: decision,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
      const reply = data as { ok: true } | DecideRefusal;
      await refreshMap({ afterCurrent: true });
      if (!reply.ok) return { ok: false, code: reply.code, message: decideRefusalMessage(reply) };
      return { ok: true };
    } catch (e) {
      return failure(e, "Could not save the decision.");
    }
  },

  /** Moderators: add (no id) or edit a monument. */
  async saveMonument(input: MonumentInput & { icon?: string }): Promise<Result<{ monumentId: string }>> {
    if (backendMode === "local") {
      try {
        return { ok: true, monumentId: demo.saveMonument(input).id };
      } catch (e) {
        return failure(e, "Could not save.");
      }
    }
    const invalid = validateMonument(input);
    if (invalid) return { ok: false, message: invalid };
    try {
      const { data, error } = await getSupabase().rpc("save_monument", {
        p_id: input.id ?? null,
        p_name: input.name,
        p_neighborhood: input.neighborhood,
        p_description: input.description,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_capture_radius_m: Math.round(input.captureRadiusMeters),
        p_icon: input.icon ?? null,
      });
      if (error) throw new Error(error.message);
      const reply = data as { ok: true; monument_id: string } | { ok: false; code: string };
      await refreshMap({ afterCurrent: true });
      if (!reply.ok) return { ok: false, code: reply.code, message: MONUMENT_REFUSALS[reply.code] ?? "Could not save." };
      return { ok: true, monumentId: reply.monument_id };
    } catch (e) {
      return failure(e, "Could not save.");
    }
  },

  /** Moderators: take a monument out of play, or put it back. */
  async setMonumentActive(monumentId: string, active: boolean): Promise<Result> {
    if (backendMode === "local") {
      demo.setMonumentActive(monumentId, active);
      return { ok: true };
    }
    try {
      const { data, error } = await getSupabase().rpc("set_monument_active", { p_id: monumentId, p_active: active });
      if (error) throw new Error(error.message);
      const reply = data as { ok: true } | { ok: false; code: string };
      await refreshMap({ afterCurrent: true });
      if (!reply.ok) return { ok: false, code: reply.code, message: MONUMENT_REFUSALS[reply.code] ?? "Could not update." };
      return { ok: true };
    } catch (e) {
      return failure(e, "Could not update.");
    }
  },

  /** Moderators: end the current hold on a monument now, with a reason the player sees. */
  async releaseHold(monumentId: string, reason: string): Promise<Result<{ holderName?: string }>> {
    if (backendMode === "local") {
      try {
        const moderator = getDemoState().sessionUserId;
        if (!moderator) return { ok: false, message: "Sign in first." };
        demo.releaseHold(monumentId, moderator, reason);
        return { ok: true };
      } catch (e) {
        return failure(e, "Could not end the hold.");
      }
    }
    if (reason.trim().length < 3) return { ok: false, message: RELEASE_REFUSALS.reason_required! };
    try {
      const { data, error } = await getSupabase().rpc("release_hold", { p_monument_id: monumentId, p_reason: reason });
      if (error) throw new Error(error.message);
      const reply = data as { ok: true; holder_name?: string } | { ok: false; code: string };
      await refreshMap({ afterCurrent: true });
      if (!reply.ok) return { ok: false, code: reply.code, message: RELEASE_REFUSALS[reply.code] ?? "Could not end the hold." };
      return { ok: true, holderName: reply.holder_name };
    } catch (e) {
      return failure(e, "Could not end the hold.");
    }
  },

  /** Abandons a capture that hasn't been submitted. */
  async cancelCapture(captureId: string): Promise<Result> {
    if (backendMode === "local") {
      demo.cancelCapture(captureId);
      return { ok: true };
    }
    try {
      const { error } = await getSupabase().rpc("cancel_capture", { p_capture_id: captureId });
      if (error) throw new Error(error.message);
      await refreshMap({ afterCurrent: true });
      return { ok: true };
    } catch (e) {
      return failure(e, "Could not cancel the capture.");
    }
  },
};

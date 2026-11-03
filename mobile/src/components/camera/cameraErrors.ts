import type { CameraMode } from "../../demo/types";

export type CameraErrorCode = "denied" | "missing" | "busy" | "insecure" | "unknown";

export type CameraError = {
  code: CameraErrorCode;
  title: string;
  message: string;
};

export const CAMERA_ERRORS: Record<CameraErrorCode, CameraError> = {
  denied: {
    code: "denied",
    title: "Camera access blocked",
    message:
      "Monument Capture needs your camera to photograph the monument. Allow camera access for this site (the camera icon in the address bar, or your phone's settings), then try again.",
  },
  missing: {
    code: "missing",
    title: "No camera found",
    message: "This device doesn't seem to have a camera. You can upload a photo instead.",
  },
  busy: {
    code: "busy",
    title: "Camera is in use",
    message: "Another app or browser tab is using the camera. Close it and try again.",
  },
  insecure: {
    code: "insecure",
    title: "Camera needs a secure connection",
    message: "Browsers only allow the camera on https:// pages or localhost. Open the app over https, or upload a photo instead.",
  },
  unknown: {
    code: "unknown",
    title: "Camera couldn't start",
    message: "Something went wrong opening the camera. Try again, or upload a photo instead.",
  },
};

/** Maps a browser getUserMedia error to a user-facing message. */
export function cameraErrorFromDomError(error: unknown): CameraError {
  const name = error instanceof Error || (typeof error === "object" && error && "name" in error)
    ? String((error as { name: string }).name)
    : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return CAMERA_ERRORS.denied;
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return CAMERA_ERRORS.missing;
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return CAMERA_ERRORS.busy;
    default:
      return CAMERA_ERRORS.unknown;
  }
}

/** The error forced by Demo tools, or null when the real camera should be used. */
export function simulatedCameraError(mode: CameraMode): CameraError | null {
  return mode === "real" ? null : CAMERA_ERRORS[mode];
}

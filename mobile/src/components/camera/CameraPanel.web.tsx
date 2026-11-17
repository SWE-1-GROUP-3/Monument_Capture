// Web camera: live preview with a shutter button, using the browser's camera
// permission (getUserMedia). Every failure is shown with a way forward.
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants/theme";
import { useDemoState } from "../../demo/store";
import { Banner, Button } from "../ui";
import { CAMERA_ERRORS, cameraErrorFromDomError, simulatedCameraError, type CameraError } from "./cameraErrors";

const MAX_SIDE = 960;

type Phase = { kind: "idle" } | { kind: "starting" } | { kind: "live" } | { kind: "error"; error: CameraError };

export function CameraPanel({ onCaptured, onStart }: { onCaptured: (photoUri: string) => void; onStart?: () => void }) {
  const mode = useDemoState().settings.camera;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // Attach the stream once the <video> element is on screen.
  useEffect(() => {
    if (phase.kind === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [phase.kind]);

  const start = async () => {
    onStart?.();
    setPhase({ kind: "starting" });
    const forced = simulatedCameraError(mode);
    if (forced) {
      await new Promise((r) => setTimeout(r, 400));
      setPhase({ kind: "error", error: forced });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase({ kind: "error", error: window.isSecureContext === false ? CAMERA_ERRORS.insecure : CAMERA_ERRORS.missing });
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      });
      setPhase({ kind: "live" });
    } catch (e) {
      stop();
      setPhase({ kind: "error", error: cameraErrorFromDomError(e) });
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const uri = canvas.toDataURL("image/jpeg", 0.72);
    stop();
    setPhase({ kind: "idle" });
    onCaptured(uri);
  };

  const cancel = () => {
    stop();
    setPhase({ kind: "idle" });
  };

  if (phase.kind === "live") {
    return (
      <View style={styles.liveWrap}>
        <video
          ref={videoRef}
          aria-label="Camera preview"
          autoPlay
          muted
          playsInline
          style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "#11181c", borderRadius: theme.radius.medium }}
        />
        <View style={styles.row}>
          <Button style={{ flex: 1 }} label="Cancel" variant="ghost" onPress={cancel} />
          <Button style={{ flex: 2 }} label="Take photo" icon="radio-button-on" onPress={shoot} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.small }}>
      {phase.kind === "error" ? (
        <Banner tone="danger" title={phase.error.title}>{phase.error.message}</Banner>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons color={theme.colors.primary} name="camera-outline" size={44} />
          <Text style={styles.placeholderText}>Your browser will ask for camera permission.</Text>
        </View>
      )}
      <Button
        label={phase.kind === "starting" ? "Opening camera…" : phase.kind === "error" ? "Try camera again" : "Open camera"}
        icon="camera"
        onPress={() => void start()}
        disabled={phase.kind === "starting"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  liveWrap: { gap: theme.spacing.small },
  row: { flexDirection: "row", gap: theme.spacing.small },
  placeholder: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.large,
    gap: 6,
    justifyContent: "center",
    minHeight: 180,
    padding: theme.spacing.large,
  },
  placeholderText: { color: theme.colors.muted, textAlign: "center" },
});

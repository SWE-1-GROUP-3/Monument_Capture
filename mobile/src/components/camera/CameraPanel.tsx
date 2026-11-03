// Native camera: opens the system camera through expo-image-picker after
// asking for permission. Every failure is shown with a way forward.
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants/theme";
import { useDemoState } from "../../demo/store";
import { Banner, Button } from "../ui";
import { CAMERA_ERRORS, simulatedCameraError, type CameraError } from "./cameraErrors";

export function CameraPanel({ onCaptured, onStart }: { onCaptured: (photoUri: string) => void; onStart?: () => void }) {
  const mode = useDemoState().settings.camera;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ error: CameraError; canOpenSettings: boolean } | null>(null);

  const open = async () => {
    onStart?.();
    setBusy(true);
    setError(null);
    try {
      const forced = simulatedCameraError(mode);
      if (forced) {
        setError({ error: forced, canOpenSettings: forced.code === "denied" });
        return;
      }
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError({ error: CAMERA_ERRORS.denied, canOpenSettings: !permission.canAskAgain });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) onCaptured(uri);
    } catch {
      // Simulators and some emulators have no camera at all.
      setError({ error: CAMERA_ERRORS.missing, canOpenSettings: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.small }}>
      {error ? (
        <Banner tone="danger" title={error.error.title}>{error.error.message}</Banner>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons color={theme.colors.primary} name="camera-outline" size={44} />
          <Text style={styles.placeholderText}>You'll be asked for camera permission the first time.</Text>
        </View>
      )}
      {error?.canOpenSettings ? (
        <Button label="Open settings" icon="settings-outline" variant="secondary" onPress={() => void Linking.openSettings()} />
      ) : null}
      <Button label={busy ? "Opening camera…" : error ? "Try camera again" : "Open camera"} icon="camera" onPress={() => void open()} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
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

import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { theme } from "../../src/constants/theme";

const steps = [
  "Stand where the full monument is visible.",
  "Take a clear, well-lit photo without people blocking the subject.",
  "Confirm the monument and submit it for moderator review.",
];

export default function CaptureScreen() {
  const showPlaceholder = () => {
    Alert.alert("Camera setup is next", "Camera permissions and uploads will be connected in a later story.");
  };

  return (
    <Screen title="Capture a monument" subtitle="A clean submission helps moderators review it quickly.">
      <View style={styles.cameraPreview}>
        <Ionicons color={theme.colors.primary} name="camera-outline" size={54} />
        <Text style={styles.previewTitle}>Camera preview</Text>
        <Text style={styles.previewBody}>The native camera will appear here after the capture story is implemented.</Text>
      </View>

      <Text style={styles.sectionTitle}>Before you submit</Text>
      {steps.map((step, index) => (
        <View key={step} style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      <Pressable style={styles.button} onPress={showPlaceholder}>
        <Ionicons color="#ffffff" name="camera" size={20} />
        <Text style={styles.buttonText}>Open camera</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraPreview: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.large,
    minHeight: 230,
    justifyContent: "center",
    padding: theme.spacing.large,
  },
  previewTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "800", marginTop: 12 },
  previewBody: { color: theme.colors.muted, lineHeight: 20, marginTop: 6, textAlign: "center" },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  step: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  stepNumber: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  stepNumberText: { color: "#ffffff", fontWeight: "800" },
  stepText: { color: theme.colors.text, flex: 1, lineHeight: 21 },
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.small,
    justifyContent: "center",
    marginTop: theme.spacing.small,
    padding: 16,
  },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});

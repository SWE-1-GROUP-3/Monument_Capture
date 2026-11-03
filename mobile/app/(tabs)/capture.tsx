import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { theme } from "../../src/constants/theme";
import { captureMonument } from "../../src/data/captureMonument";
import { useCaptureEligibility } from "../../src/features/capture/useCaptureEligibility";

const statusIcon = {
  idle: "location-outline",
  checking: "locate-outline",
  eligible: "checkmark-circle-outline",
  outside: "walk-outline",
  inaccurate: "refresh-outline",
  "permission-denied": "lock-closed-outline",
  unavailable: "warning-outline",
} as const;

export default function CaptureScreen() {
  const { state, verify, reset } = useCaptureEligibility(captureMonument);
  const isChecking = state.status === "checking";
  const isEligible = state.status === "eligible";

  const continueToPhoto = () => {
    Alert.alert(
      "Location verified",
      "You can proceed to the monument photo step. Camera capture will be implemented in US-06.",
    );
  };

  return (
    <Screen
      title="Start a capture"
      subtitle="Verify that you are within the monument's capture radius before taking a photo."
    >
      <View style={styles.monumentCard}>
        <View style={styles.monumentIcon}>
          <Ionicons color={theme.colors.primary} name="location" size={26} />
        </View>
        <View style={styles.monumentDetails}>
          <Text style={styles.eyebrow}>SELECTED MONUMENT</Text>
          <Text style={styles.monumentName}>{captureMonument.name}</Text>
          <Text style={styles.radius}>Capture radius: {captureMonument.captureRadiusMeters} meters</Text>
        </View>
      </View>

      <View
        accessibilityLiveRegion="polite"
        style={[styles.statusCard, isEligible && styles.eligibleCard]}
      >
        <Ionicons
          color={isEligible ? theme.colors.primary : theme.colors.warning}
          name={statusIcon[state.status]}
          size={28}
        />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>{statusTitle(state.status)}</Text>
          <Text style={styles.statusMessage}>{state.message}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isChecking}
        onPress={verify}
        style={[styles.primaryButton, isChecking && styles.disabledButton]}
      >
        <Ionicons color="#ffffff" name="navigate" size={20} />
        <Text style={styles.primaryButtonText}>
          {isChecking ? "Checking location…" : isEligible ? "Check location again" : "Check location to start"}
        </Text>
      </Pressable>

      {isEligible ? (
        <Pressable accessibilityRole="button" onPress={continueToPhoto} style={styles.continueButton}>
          <Ionicons color="#ffffff" name="camera" size={20} />
          <Text style={styles.primaryButtonText}>Continue to monument photo</Text>
        </Pressable>
      ) : null}

      {state.status !== "idle" && !isChecking ? (
        <Pressable accessibilityRole="button" onPress={reset} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset location check</Text>
        </Pressable>
      ) : null}

      <View style={styles.helpCard}>
        <Ionicons color={theme.colors.muted} name="information-circle-outline" size={22} />
        <Text style={styles.helpText}>
          Location is used only to verify proximity. If the signal is inaccurate, move outdoors and retry.
        </Text>
      </View>
    </Screen>
  );
}

function statusTitle(status: keyof typeof statusIcon) {
  switch (status) {
    case "checking":
      return "Verifying proximity";
    case "eligible":
      return "Ready to capture";
    case "outside":
      return "Move closer";
    case "inaccurate":
      return "Location needs a retry";
    case "permission-denied":
      return "Location permission required";
    case "unavailable":
      return "Location unavailable";
    default:
      return "Location check required";
  }
}

const styles = StyleSheet.create({
  monumentCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.large,
  },
  monumentIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  monumentDetails: { flex: 1 },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  monumentName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  radius: { color: theme.colors.muted, marginTop: 5 },
  statusCard: {
    alignItems: "flex-start",
    backgroundColor: "#fff7e8",
    borderColor: "#efd9a8",
    borderRadius: theme.radius.large,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.large,
  },
  eligibleCard: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: "#b9d9c6",
  },
  statusText: { flex: 1 },
  statusTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  statusMessage: { color: theme.colors.muted, lineHeight: 21, marginTop: 5 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.small,
    justifyContent: "center",
    padding: 16,
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: "#0f5132",
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.small,
    justifyContent: "center",
    padding: 16,
  },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  resetButton: { alignItems: "center", padding: 10 },
  resetButtonText: { color: theme.colors.primary, fontWeight: "700" },
  helpCard: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.small,
    padding: theme.spacing.medium,
  },
  helpText: { color: theme.colors.muted, flex: 1, lineHeight: 20 },
});

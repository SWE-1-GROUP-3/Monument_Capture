import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

// Shared placeholder until the selected-monument proximity handoff is connected.
export function StartCapturePlaceholder() {
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.button}>
        <Text style={styles.buttonText}>Start Capture</Text>
      </Pressable>
      <Text style={styles.explanation}>Proximity integration is pending.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.large },
  button: { backgroundColor: theme.colors.primary, opacity: 0.5, borderRadius: theme.radius.medium,
    padding: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  explanation: { color: theme.colors.muted, lineHeight: 21 },
});

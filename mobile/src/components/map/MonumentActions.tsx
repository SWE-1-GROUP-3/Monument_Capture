import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

export function MonumentActions({ available, onViewDetails }: { available: boolean; onViewDetails: () => void }) {
  return (
    <View style={styles.actions}>
      <Pressable accessibilityRole="link" accessibilityLabel="View details" onPress={onViewDetails} style={styles.details}>
        <Text style={styles.detailsText}>View details →</Text>
      </Pressable>
      {available ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.capture}>
          <Text style={styles.captureText}>Start Capture</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  details: { minHeight: 44, alignSelf: "flex-start", maxWidth: "100%", justifyContent: "center" },
  detailsText: { color: theme.colors.primary, fontSize: 14, fontWeight: "600" },
  capture: { minHeight: 44, width: "100%", backgroundColor: theme.colors.primary, opacity: 0.5,
    borderRadius: theme.radius.medium, paddingHorizontal: 12, paddingVertical: 10,
    alignItems: "center", justifyContent: "center" },
  captureText: { color: "#ffffff", fontSize: 14, fontWeight: "700", textAlign: "center" },
});

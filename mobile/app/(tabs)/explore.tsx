import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { availabilityAppearance } from "../../src/components/map/availabilityAppearance";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { theme } from "../../src/constants/theme";
import { mapMonuments } from "../../src/data/mapMonuments";
import { usePlayerLocation } from "../../src/hooks/usePlayerLocation";
import { useStatusTime } from "../../src/hooks/useStatusTime";

import { getValidMonuments } from "../../src/utils/mapData";

export default function ExploreScreen() {
  const { location, message, loading, locate } = usePlayerLocation();
  const nowMs = useStatusTime();
  const monuments = getValidMonuments(mapMonuments);
  return (
    <Screen title="Monument map" subtitle="Explore the New York City prototype play area. Select a marker to see its name and status.">
      <Text style={styles.summary}>{monuments.length} monuments · NYC · Mock data</Text>
      <View style={styles.map}>
        <MonumentMap monuments={monuments} playerLocation={location} nowMs={nowMs} onViewDetails={(monumentId) => router.push({
          pathname: "/monuments/[monumentId]", params: { monumentId },
        })} />
      </View>
      <View accessibilityLabel="Map legend" style={styles.legend}>
        {[...Object.values(availabilityAppearance), { color: "#2563eb", label: "Your location" }].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
      {monuments.length === 0 ? <Text style={styles.message}>No monuments available in this play area yet.</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={locate} style={[styles.button, loading && { opacity: 0.6 }]}>
        <Text style={styles.buttonText}>{loading ? "Finding location…" : "Show my location"}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { color: theme.colors.primary, fontWeight: "700" },
  map: { borderRadius: theme.radius.medium, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.border },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.medium },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: theme.colors.text, fontSize: 13 },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.medium, padding: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  message: { color: theme.colors.muted, lineHeight: 21 },
});

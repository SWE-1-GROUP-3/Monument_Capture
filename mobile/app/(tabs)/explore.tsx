import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { theme } from "../../src/constants/theme";
import { mapMonuments } from "../../src/data/mapMonuments";
import { usePlayerLocation } from "../../src/hooks/usePlayerLocation";

import { getValidMonuments } from "../../src/utils/mapData";

export default function ExploreScreen() {
  const { location, message, loading, locate } = usePlayerLocation();
  const monuments = getValidMonuments(mapMonuments);
  return (
    <Screen title="Monument map" subtitle="Explore the New York City prototype play area. Select a marker to see its name.">
      <Text style={styles.summary}>{monuments.length} monuments · NYC · Mock data</Text>
      <View style={styles.map}>
        <MonumentMap monuments={monuments} playerLocation={location} />
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
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.medium, padding: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  message: { color: theme.colors.muted, lineHeight: 21 },
});

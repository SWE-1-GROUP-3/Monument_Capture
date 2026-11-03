import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { theme } from "../../src/constants/theme";
import { sampleMonuments } from "../../src/data/sampleMonuments";

export default function ExploreScreen() {
  return (
    <Screen title="Explore" subtitle="Sample monuments ready to be connected to the API.">
      {sampleMonuments.map((monument) => (
        <View key={monument.id} style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons color={theme.colors.primary} name="location" size={24} />
          </View>
          <View style={styles.details}>
            <Text style={styles.name}>{monument.name}</Text>
            <Text style={styles.neighborhood}>{monument.neighborhood}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.distance}>{monument.distance}</Text>
              <Text style={styles.status}>{monument.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.medium,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.medium,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  details: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  neighborhood: { color: theme.colors.muted, marginTop: 3 },
  metaRow: { flexDirection: "row", gap: theme.spacing.small, marginTop: 10 },
  distance: { color: theme.colors.primary, fontSize: 12, fontWeight: "700" },
  status: { color: theme.colors.warning, fontSize: 12, fontWeight: "700" },
});

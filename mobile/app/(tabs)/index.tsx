import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../src/components/InfoCard";
import { Screen } from "../../src/components/Screen";
import { theme } from "../../src/constants/theme";

export default function HomeScreen() {
  return (
    <Screen
      title="Ready to explore?"
      subtitle="Discover local history and help your team claim the city."
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons color={theme.colors.primary} name="flag" size={28} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>NEXT ADVENTURE</Text>
          <Text style={styles.heroTitle}>Find a monument nearby</Text>
          <Text style={styles.heroBody}>Browse the map, visit a site, and submit a clear photo.</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <InfoCard label="Captured" value="0" />
        <InfoCard label="Pending" value="0" />
        <InfoCard label="Team points" value="0" />
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <Pressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/explore")}>
        <Ionicons color="#ffffff" name="navigate" size={20} />
        <Text style={styles.primaryButtonText}>Explore monuments</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.push("/(tabs)/capture")}>
        <Ionicons color={theme.colors.primary} name="camera" size={20} />
        <Text style={styles.secondaryButtonText}>Start a capture</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.large,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.large,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  heroText: { flex: 1 },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  heroBody: {
    color: theme.colors.muted,
    lineHeight: 20,
    marginTop: 6,
  },
  statsRow: { flexDirection: "row", gap: theme.spacing.small },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.small,
    justifyContent: "center",
    padding: 16,
  },
  primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.small,
    justifyContent: "center",
    padding: 15,
  },
  secondaryButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: "700" },
});

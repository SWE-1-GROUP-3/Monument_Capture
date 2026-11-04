import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../src/components/InfoCard";
import { Screen } from "../../src/components/Screen";
import { theme } from "../../src/constants/theme";

export default function ProfileScreen() {
  return (
    <Screen title="Profile" subtitle="Your Monument Capture activity and account role.">
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons color={theme.colors.primary} name="person" size={34} />
        </View>
        <View>
          <Text style={styles.name}>New Explorer</Text>
          <Text style={styles.role}>Player</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <InfoCard label="Approved" value="0" />
        <InfoCard label="Pending" value="0" />
        <InfoCard label="Rejected" value="0" />
      </View>

      <View style={styles.notice}>
        <Ionicons color={theme.colors.primary} name="information-circle" size={24} />
        <Text style={styles.noticeText}>Authentication and live player data will replace this starter profile.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.large,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  name: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
  role: { color: theme.colors.primary, fontWeight: "700", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: theme.spacing.small },
  notice: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.medium,
  },
  noticeText: { color: theme.colors.text, flex: 1, lineHeight: 20 },
});

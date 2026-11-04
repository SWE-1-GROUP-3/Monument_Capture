import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../src/components/InfoCard";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { reviews, useCurrentUser, useReviewState } from "../../src/review/reviewStore";

export default function ProfileScreen() {
  const state = useReviewState();
  const user = useCurrentUser();
  const mine = state.captures.filter((c) => c.playerId === user?.id);
  const count = (status: string) => String(mine.filter((c) => c.status === status).length);
  return (
    <Screen title="Profile" subtitle="Your Monument Capture activity and account role.">
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons color={theme.colors.primary} name="person" size={34} />
        </View>
        <View>
          <Text style={styles.name}>{user?.name ?? "New Explorer"}</Text>
          <Text style={styles.role}>{user?.role === "moderator" ? "Moderator" : "Player"}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <InfoCard label="Approved" value={count("approved")} />
        <InfoCard label="Pending" value={count("pending")} />
        <InfoCard label="Rejected" value={count("rejected")} />
      </View>

      <View style={styles.notice}>
        <Ionicons color={theme.colors.primary} name="information-circle" size={24} />
        <Text style={styles.noticeText}>Authentication and live player data will replace this starter profile.</Text>
      </View>

      <Text style={styles.sectionTitle}>Switch user</Text>
      <Text style={styles.noticeText}>Stand-in for login (US-01) until it is merged, so the player and moderator views can be tested.</Text>
      {state.users.map((u) => (
        <Card key={u.id} onPress={() => reviews.switchUser(u.id)} style={[styles.userRow, u.id === user?.id && styles.userRowActive]}>
          <Text style={styles.userName}>{u.name}</Text>
          <Text style={styles.userRole}>{u.id === user?.id ? "Current · " : ""}{u.role === "moderator" ? "Moderator" : "Player"}</Text>
        </Card>
      ))}
      <Card onPress={() => reviews.reset()} style={styles.userRow}>
        <Text style={styles.userRole}>Reset mock data</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  userRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  userRowActive: { borderColor: theme.colors.primary },
  userName: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  userRole: { color: theme.colors.muted },
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

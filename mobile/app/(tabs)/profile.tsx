import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { DemoTools } from "../../src/components/DemoTools";
import { InfoCard } from "../../src/components/InfoCard";
import { Screen } from "../../src/components/Screen";
import { Button, Card, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { getPlayerStats } from "../../src/demo/rules";
import { demo, useCurrentUser, useDemoState, useNow } from "../../src/demo/store";

export default function ProfileScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const now = useNow(10_000);
  if (!user) return null;
  const isModerator = user.role === "moderator";
  const stats = getPlayerStats(state, user.id, now);
  const others = state.users.filter((u) => u.id !== user.id);

  return (
    <Screen title="Profile">
      <View style={styles.profileCard}>
        <View style={[styles.avatar, isModerator && { backgroundColor: theme.colors.warningSoft }]}>
          <Ionicons
            color={isModerator ? theme.colors.warning : theme.colors.primary}
            name={isModerator ? "shield-checkmark" : "person"}
            size={34}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={[styles.role, isModerator && { color: theme.colors.warning }]}>{isModerator ? "Moderator" : "Player"}</Text>
        </View>
      </View>

      {!isModerator ? (
        <View style={styles.statsRow}>
          <InfoCard label="Approved" value={String(stats.approved)} />
          <InfoCard label="Pending" value={String(stats.pending)} />
          <InfoCard label="Rejected" value={String(stats.rejected)} />
        </View>
      ) : null}

      <Button
        label="Sign out"
        icon="log-out-outline"
        variant="secondary"
        onPress={() => {
          demo.logout();
          router.replace("/login");
        }}
      />

      <DemoTools />

      <SectionTitle>Switch account (demo)</SectionTitle>
      {others.map((u) => (
        <Card key={u.id} onPress={() => { demo.login(u.email); router.replace("/"); }} style={styles.account}>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{u.name}</Text>
            <Text style={styles.email}>{u.role === "moderator" ? "Moderator" : "Player"} · {u.email}</Text>
          </View>
          <Ionicons color={theme.colors.muted} name="swap-horizontal" size={20} />
        </Card>
      ))}
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
  email: { color: theme.colors.muted, marginTop: 2 },
  role: { color: theme.colors.primary, fontWeight: "700", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: theme.spacing.small },
  account: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  accountName: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
});

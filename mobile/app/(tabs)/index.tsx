import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../src/components/InfoCard";
import { Screen } from "../../src/components/Screen";
import { Banner, Button, Card, EmptyState, Pill, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import {
  findMonument,
  formatCountdown,
  formatTimeAgo,
  getHoldingsFor,
  getInProgressCapture,
  getPendingQueue,
  getPlayerStats,
} from "../../src/demo/rules";
import { useCurrentUser, useDemoState, useNow } from "../../src/demo/store";
import type { DemoState, User } from "../../src/demo/types";
import { monumentViews } from "../../src/demo/views";

export default function HomeScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const now = useNow();
  if (!user) return null;
  return user.role === "moderator"
    ? <ModeratorHome state={state} user={user} now={now} />
    : <PlayerHome state={state} user={user} now={now} />;
}

function PlayerHome({ state, user, now }: { state: DemoState; user: User; now: number }) {
  const stats = getPlayerStats(state, user.id, now);
  const holdings = getHoldingsFor(state, user.id, now);
  const views = monumentViews(state, user.id, now);
  const freeCount = views.filter((v) => v.kind === "free").length;
  const inProgress = getInProgressCapture(state, user.id);
  const inProgressMonument = inProgress ? findMonument(state, inProgress.monumentId) : undefined;

  return (
    <Screen title={`Hi, ${user.name.split(" ")[0]}`} subtitle="Hold monuments to win. Every lock lasts one hour, then the monument is up for grabs again.">
      {inProgress && inProgressMonument ? (
        <Banner tone="info" title="Capture in progress" icon="camera">
          <Text style={styles.bannerBody}>You started capturing {inProgressMonument.name}. Add a photo to submit it.</Text>
          <Button compact label="Continue capture" onPress={() => router.push(`/capture?monumentId=${inProgress.monumentId}`)} style={{ alignSelf: "flex-start", marginTop: 6 }} />
        </Banner>
      ) : null}

      <View style={styles.statsRow}>
        <InfoCard label="Holding now" value={String(stats.holding)} />
        <InfoCard label="Pending" value={String(stats.pending)} />
        <InfoCard label="Approved" value={String(stats.approved)} />
      </View>

      <SectionTitle>Your holdings</SectionTitle>
      {holdings.length === 0 ? (
        <Card>
          <EmptyState icon="flag-outline" title="You don't hold any monuments yet" body={`${freeCount} monuments are free to capture right now.`} />
        </Card>
      ) : (
        holdings.map(({ monument, hold }) => (
          <Card key={monument.id} onPress={() => router.push(`/monument/${monument.id}`)} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: theme.colors.mine }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{monument.name}</Text>
              <Text style={styles.rowMeta}>Lock expires in {formatCountdown(hold.lockedUntil - now)}</Text>
            </View>
            <Pill kind="mine" />
          </Card>
        ))
      )}

      <View style={styles.hero}>
        <Ionicons color={theme.colors.primary} name="navigate" size={26} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{freeCount} monuments are free</Text>
          <Text style={styles.heroBody}>Walk to one, check in, and photograph it.</Text>
        </View>
      </View>
      <Button label="Open the map" icon="map" onPress={() => router.push("/explore")} />
      <Button label="Start a capture" icon="camera" variant="secondary" onPress={() => router.push("/capture")} />
    </Screen>
  );
}

function ModeratorHome({ state, user, now }: { state: DemoState; user: User; now: number }) {
  const queue = getPendingQueue(state);
  const views = monumentViews(state, user.id, now, true);
  const held = views.filter((v) => v.kind === "held" || v.kind === "mine").length;
  const active = views.filter((v) => v.kind !== "inactive").length;
  const oldest = queue[0];

  return (
    <Screen title={`Hi, ${user.name.split(" ")[0]}`} subtitle="Review captures and keep the monument list accurate.">
      <View style={styles.statsRow}>
        <InfoCard label="Waiting review" value={String(queue.length)} />
        <InfoCard label="Held now" value={String(held)} />
        <InfoCard label="Active monuments" value={String(active)} />
      </View>

      {oldest ? (
        <Card onPress={() => router.push(`/review/${oldest.capture.id}`)}>
          <Text style={styles.eyebrow}>OLDEST IN QUEUE</Text>
          <Text style={styles.rowTitle}>{oldest.monument?.name ?? "Unknown monument"}</Text>
          <Text style={styles.rowMeta}>
            {oldest.player?.name ?? "Unknown player"} · submitted {formatTimeAgo(now - (oldest.capture.submittedAt ?? now))}
          </Text>
        </Card>
      ) : (
        <Card>
          <EmptyState icon="checkmark-done" title="Queue is clear" body="New captures will appear here as players submit them." />
        </Card>
      )}

      <Button label={`Review queue (${queue.length})`} icon="checkmark-done" onPress={() => router.push("/queue")} />
      <Button label="Manage monuments" icon="business" variant="secondary" onPress={() => router.push("/manage")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: theme.spacing.small },
  row: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  dot: { borderRadius: 6, height: 12, width: 12 },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  rowMeta: { color: theme.colors.muted, marginTop: 2 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  bannerBody: { color: theme.colors.text, lineHeight: 20 },
  hero: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.large,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.large,
  },
  heroTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  heroBody: { color: theme.colors.muted, marginTop: 2 },
});

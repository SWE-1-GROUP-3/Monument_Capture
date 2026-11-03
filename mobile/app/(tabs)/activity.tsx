import { router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Card, EmptyState, Pill, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { formatCountdown, formatTimeAgo, getHistoryFor, getHoldingsFor } from "../../src/demo/rules";
import { useCurrentUser, useDemoState, useNow } from "../../src/demo/store";

export default function ActivityScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const now = useNow();
  if (!user) return null;

  const holdings = getHoldingsFor(state, user.id, now);
  const history = getHistoryFor(state, user.id);

  return (
    <Screen title="My activity" subtitle="What you hold right now and every capture you've submitted.">
      <SectionTitle>Holding now</SectionTitle>
      {holdings.length === 0 ? (
        <Card>
          <EmptyState icon="flag-outline" title="No monuments held" body="Approved captures lock a monument to you for one hour." />
        </Card>
      ) : (
        holdings.map(({ monument, hold }) => (
          <Card key={monument.id} onPress={() => router.push(`/monuments/${monument.id}`)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{monument.name}</Text>
              <Text style={styles.meta}>{monument.neighborhood}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.countdown}>{formatCountdown(hold.lockedUntil - now)}</Text>
              <Text style={styles.meta}>left</Text>
            </View>
          </Card>
        ))
      )}

      <SectionTitle>Capture history</SectionTitle>
      {history.length === 0 ? (
        <Card>
          <EmptyState icon="camera-outline" title="No captures yet" body="Submitted captures and moderator decisions will show up here." />
        </Card>
      ) : (
        history.map(({ capture, monument, review }) => (
          <Card key={capture.id} style={styles.historyCard}>
            {capture.photoUri ? <Image source={{ uri: capture.photoUri }} style={styles.thumb} /> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{monument?.name ?? "Removed monument"}</Text>
              <Text style={styles.meta}>
                Submitted {formatTimeAgo(now - (capture.submittedAt ?? capture.startedAt))} · {capture.distanceMeters} m away
              </Text>
              <Pill kind={{ capture: capture.status }} />
              {review ? (
                <Text style={[styles.reason, review.decision === "rejected" && { color: theme.colors.danger }]}>
                  Moderator: “{review.reason}”
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: theme.colors.muted },
  countdown: { color: theme.colors.mine, fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "900" },
  historyCard: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.medium },
  thumb: { backgroundColor: theme.colors.primarySoft, borderRadius: 10, height: 64, width: 64 },
  reason: { color: theme.colors.text, fontStyle: "italic", lineHeight: 20 },
});

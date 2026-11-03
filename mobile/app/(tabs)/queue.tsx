import { router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Card, EmptyState, Pill } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { formatTimeAgo, getHold, getPendingQueue } from "../../src/demo/rules";
import { useDemoState, useNow } from "../../src/demo/store";

export default function QueueScreen() {
  const state = useDemoState();
  const now = useNow(10_000);
  const queue = getPendingQueue(state);

  return (
    <Screen title="Review queue" subtitle="Oldest first. Open a capture to check the photo and decide.">
      {queue.length === 0 ? (
        <Card>
          <EmptyState icon="checkmark-done" title="Nothing to review" body="New captures appear here as soon as players submit them." />
        </Card>
      ) : (
        queue.map(({ capture, monument, player }) => {
          const held = monument ? getHold(state, monument.id, now) : null;
          const outside = monument ? capture.distanceMeters > monument.captureRadiusMeters : false;
          return (
            <Card key={capture.id} onPress={() => router.push(`/review/${capture.id}`)} style={styles.row}>
              <Image source={{ uri: capture.photoUri }} style={styles.thumb} accessibilityLabel={`Photo of ${monument?.name ?? "monument"}`} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.title}>{monument?.name ?? "Unknown monument"}</Text>
                <Text style={styles.meta}>{player?.name ?? "Unknown player"} · {formatTimeAgo(now - (capture.submittedAt ?? now))}</Text>
                <Text style={[styles.meta, outside && { color: theme.colors.danger }]}>
                  {capture.distanceMeters} m from monument (radius {monument?.captureRadiusMeters ?? "?"} m) · ±{capture.accuracyMeters} m
                </Text>
                <View style={styles.flags}>
                  {held?.status === "held" ? <Pill kind="held" label={`Now held by ${held.holder.name}`} /> : null}
                  {capture.simulatedPosition ? <Pill kind="inactive" label="Simulated location" /> : null}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.medium },
  thumb: { backgroundColor: theme.colors.primarySoft, borderRadius: 10, height: 80, width: 80 },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: theme.colors.muted },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
});

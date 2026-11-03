import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { RequireUser } from "../../src/components/RequireUser";
import { Screen } from "../../src/components/Screen";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { Banner, Button, Card, DetailRow, Pill, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { findMonument, findUser, formatCountdown, formatTimeAgo, reviewFor } from "../../src/demo/rules";
import { demo, useDemoState, useNow } from "../../src/demo/store";
import { monumentView, toMapMonument } from "../../src/demo/views";

export default function MonumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useDemoState();
  const now = useNow();

  return (
    <RequireUser>
      {(user) => {
        const monument = findMonument(state, id);
        if (!monument) {
          return (
            <Screen title="Monument not found" back backTo="/explore">
              <Banner tone="warning">This monument does not exist or was removed.</Banner>
            </Screen>
          );
        }
        const view = monumentView(state, monument, user.id, now);
        const hold = view.hold;
        const isPlayer = user.role === "player";
        const sim = state.settings.location;
        const simulatedHere = sim.mode === "simulated" && sim.monumentId === monument.id;

        const pastHolders = state.captures
          .filter((c) => c.monumentId === monument.id && c.status === "approved")
          .map((c) => ({ capture: c, review: reviewFor(state, c.id), player: findUser(state, c.playerId) }))
          .sort((a, b) => (b.review?.reviewedAt ?? 0) - (a.review?.reviewedAt ?? 0))
          .slice(0, 5);

        return (
          <Screen title={monument.name} subtitle={monument.neighborhood} back backTo="/explore">
            <Card style={[styles.status, statusStyle[view.kind]]}>
              <Pill kind={view.kind} />
              {hold.status === "held" ? (
                <>
                  <Text style={styles.statusTitle}>
                    {hold.holder.id === user.id ? "You hold this monument" : `Held by ${hold.holder.name}`}
                  </Text>
                  <Text style={styles.countdown} accessibilityLabel="Time left on lock">{formatCountdown(hold.lockedUntil - now)}</Text>
                  <Text style={styles.statusMeta}>left on the lock. Nobody can capture it until then.</Text>
                </>
              ) : view.kind === "inactive" ? (
                <Text style={styles.statusTitle}>Not currently part of the game</Text>
              ) : (
                <>
                  <Text style={styles.statusTitle}>Free to capture</Text>
                  <Text style={styles.statusMeta}>The first approved capture locks it for one hour.</Text>
                </>
              )}
            </Card>

            {isPlayer && view.kind === "free" ? (
              <Button label="Capture this monument" icon="camera" onPress={() => router.push(`/capture?monumentId=${monument.id}`)} />
            ) : null}
            {isPlayer && (view.kind === "held" || view.kind === "mine") ? (
              <Button
                label="Try to capture anyway"
                icon="camera-outline"
                variant="secondary"
                onPress={() => router.push(`/capture?monumentId=${monument.id}`)}
              />
            ) : null}
            {user.role === "moderator" ? (
              <Button label="Edit monument" icon="create-outline" variant="secondary" onPress={() => router.push(`/manage-monument/${monument.id}`)} />
            ) : null}

            <View style={styles.map}>
              <MonumentMap monuments={[toMapMonument(view)]} playerLocation={sim.mode === "simulated" ? sim : null} height={220} />
            </View>

            <Card>
              {monument.description ? <Text style={styles.description}>{monument.description}</Text> : null}
              <DetailRow label="Capture radius" value={`${monument.captureRadiusMeters} m`} />
              <DetailRow label="Coordinates" value={`${monument.latitude.toFixed(4)}, ${monument.longitude.toFixed(4)}`} />
            </Card>

            {isPlayer ? (
              <Card style={{ borderStyle: "dashed" }}>
                <Text style={styles.demoLabel}>DEMO TOOL</Text>
                <Text style={styles.description}>
                  {simulatedHere
                    ? "Your simulated location is at this monument. Go to Capture to check in."
                    : "Not standing here? Pretend you are, so the capture check passes during the demo."}
                </Text>
                <Button
                  compact
                  variant="ghost"
                  icon="locate"
                  label={simulatedHere ? "Simulated location is here" : "Teleport here (demo)"}
                  disabled={simulatedHere}
                  onPress={() => demo.teleportTo(monument)}
                />
              </Card>
            ) : null}

            <SectionTitle>Recent holders</SectionTitle>
            {pastHolders.length === 0 ? (
              <Text style={styles.statusMeta}>Nobody has captured this monument yet.</Text>
            ) : (
              pastHolders.map(({ capture, review, player }) => (
                <Card key={capture.id} style={styles.row}>
                  <Text style={styles.rowTitle}>{player?.name ?? "Unknown player"}</Text>
                  <Text style={styles.statusMeta}>{review ? formatTimeAgo(now - review.reviewedAt) : ""}</Text>
                </Card>
              ))
            )}
          </Screen>
        );
      }}
    </RequireUser>
  );
}

const statusStyle = StyleSheet.create({
  free: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primarySoft },
  held: { backgroundColor: theme.colors.heldSoft, borderColor: theme.colors.heldSoft },
  mine: { backgroundColor: theme.colors.mineSoft, borderColor: theme.colors.mineSoft },
  inactive: {},
});

const styles = StyleSheet.create({
  status: { gap: 6, padding: theme.spacing.large },
  statusTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
  countdown: { color: theme.colors.text, fontSize: 40, fontVariant: ["tabular-nums"], fontWeight: "900" },
  statusMeta: { color: theme.colors.muted, lineHeight: 20 },
  map: { borderColor: theme.colors.border, borderRadius: theme.radius.medium, borderWidth: 1, overflow: "hidden" },
  description: { color: theme.colors.text, lineHeight: 21 },
  demoLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowTitle: { color: theme.colors.text, fontWeight: "700" },
});

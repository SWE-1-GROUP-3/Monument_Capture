import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { RequireUser } from "../../src/components/RequireUser";
import { Screen } from "../../src/components/Screen";
import { availabilityAppearance, viewerHoldAppearance } from "../../src/components/map/availabilityAppearance";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { Banner, Button, Card, DetailRow, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { findMonument, findUser, formatTimeAgo, reviewFor } from "../../src/demo/rules";
import { demo, useDemoState } from "../../src/demo/store";
import { monumentView, toMapMonument } from "../../src/demo/views";
import { useStatusTime } from "../../src/hooks/useStatusTime";
import { formatLockTime } from "../../src/utils/formatLockTime";
import { getMonumentAvailability } from "../../src/utils/monumentAvailability";

// US-03 monument details (Yuming): status, holder and live lock countdown, with
// "Back to map" in the header. Data comes from the shared demo store, and
// Start Capture is wired to the US-05 proximity check.
export default function MonumentDetailsScreen() {
  const { monumentId } = useLocalSearchParams<{ monumentId?: string | string[] }>();
  const state = useDemoState();
  const nowMs = useStatusTime();

  return (
    <RequireUser>
      {(user) => {
        // Route parameters identify the shared record; never trust copied status in a URL.
        const monument = typeof monumentId === "string" ? findMonument(state, monumentId) : undefined;
        if (!monument) {
          return <Screen title="Monument not found" subtitle="This monument is not in the play area. Use Back to map to choose a monument." />;
        }

        const view = monumentView(state, monument, user.id, nowMs);
        const mapMonument = toMapMonument(view);
        const availability = getMonumentAvailability(mapMonument, nowMs);
        const heldByMe = availability.status === "locked" && !!mapMonument.hold?.heldByViewer;
        const appearance = availabilityAppearance[availability.status];
        const isPlayer = user.role === "player";
        const sim = state.settings.location;
        const simulatedHere = sim.mode === "simulated" && sim.monumentId === monument.id;
        const goCapture = () => router.push(`/capture?monumentId=${monument.id}`);

        const pastHolders = state.captures
          .filter((c) => c.monumentId === monument.id && c.status === "approved")
          .map((c) => ({ capture: c, review: reviewFor(state, c.id), player: findUser(state, c.playerId) }))
          .sort((a, b) => (b.review?.reviewedAt ?? 0) - (a.review?.reviewedAt ?? 0))
          .slice(0, 5);

        return (
          <Screen title={monument.name} subtitle={monument.neighborhood}>
            {!monument.active ? <Banner tone="warning">This monument is not currently part of the game.</Banner> : null}

            <View style={styles.card}>
              <Text style={[styles.status, { color: heldByMe ? viewerHoldAppearance.color : appearance.color }]}>
                {heldByMe ? "Locked · held by you" : appearance.description}
              </Text>
              {availability.status === "locked" ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Held by</Text>
                    <Text style={styles.value}>{heldByMe ? `${availability.holderDisplayName} (you)` : availability.holderDisplayName}</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Remaining lock time</Text>
                    <Text style={[styles.value, styles.countdown]}>{formatLockTime(availability.remainingMs)}</Text>
                  </View>
                </>
              ) : null}
              {availability.status === "unknown" ? <Text style={styles.explanation}>Availability could not be determined.</Text> : null}
            </View>

            {isPlayer && monument.active && availability.status === "available" ? (
              <Button label="Start Capture" icon="camera" onPress={goCapture} />
            ) : null}
            {isPlayer && monument.active && availability.status === "locked" ? (
              <Button label="Try to capture anyway" icon="camera-outline" variant="secondary" onPress={goCapture} />
            ) : null}
            {user.role === "moderator" ? (
              <Button label="Edit monument" icon="create-outline" variant="secondary" onPress={() => router.push(`/manage-monument/${monument.id}`)} />
            ) : null}

            <View style={styles.map}>
              <MonumentMap
                monuments={[mapMonument]}
                playerLocation={sim.mode === "simulated" ? sim : null}
                nowMs={nowMs}
                height={220}
              />
            </View>

            <Card>
              {monument.description ? <Text style={styles.description}>{monument.description}</Text> : null}
              <DetailRow label="Capture radius" value={`${monument.captureRadiusMeters} m`} />
              <DetailRow label="Coordinates" value={`${monument.latitude.toFixed(4)}, ${monument.longitude.toFixed(4)}`} />
            </Card>

            {isPlayer && monument.active ? (
              <Card style={{ borderStyle: "dashed" }}>
                <Text style={styles.demoLabel}>DEMO TOOL</Text>
                <Text style={styles.description}>
                  {simulatedHere
                    ? "Your simulated location is at this monument. Start the capture to check in."
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
              <Text style={styles.explanation}>Nobody has captured this monument yet.</Text>
            ) : (
              pastHolders.map(({ capture, review, player }) => (
                <Card key={capture.id} style={styles.row}>
                  <Text style={styles.rowTitle}>{player?.name ?? "Unknown player"}</Text>
                  <Text style={styles.explanation}>{review ? formatTimeAgo(nowMs - review.reviewedAt) : ""}</Text>
                </Card>
              ))
            )}
          </Screen>
        );
      }}
    </RequireUser>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.large, padding: theme.spacing.large, gap: theme.spacing.large },
  status: { fontSize: 18, fontWeight: "700" },
  field: { gap: theme.spacing.small },
  label: { color: theme.colors.muted, fontSize: 14 },
  value: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  countdown: { fontVariant: ["tabular-nums"] },
  explanation: { color: theme.colors.muted, lineHeight: 21 },
  map: { borderColor: theme.colors.border, borderRadius: theme.radius.medium, borderWidth: 1, overflow: "hidden" },
  description: { color: theme.colors.text, lineHeight: 21 },
  demoLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowTitle: { color: theme.colors.text, fontWeight: "700" },
});

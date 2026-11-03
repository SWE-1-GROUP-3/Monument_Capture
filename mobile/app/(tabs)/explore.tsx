import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { availabilityAppearance, viewerHoldAppearance } from "../../src/components/map/availabilityAppearance";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { Banner, Card, Chip, Pill } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { useCurrentUser, useDemoState } from "../../src/demo/store";
import { monumentViews, toMapMonument } from "../../src/demo/views";
import { usePlayerLocation } from "../../src/hooks/usePlayerLocation";
import { useStatusTime } from "../../src/hooks/useStatusTime";

type Filter = "all" | "free" | "held";

// US-02 map (Bill) + US-03 availability legend, live status and details navigation (Yuming),
// fed from the shared demo store so holds come from approved captures.
export default function ExploreScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const { location, message, loading, locate } = usePlayerLocation();
  const nowMs = useStatusTime();
  const [filter, setFilter] = useState<Filter>("all");

  const views = monumentViews(state, user?.id, nowMs);
  const monuments = views.map(toMapMonument);
  const sim = state.settings.location;
  const playerLocation = sim.mode === "simulated"
    ? { latitude: sim.latitude, longitude: sim.longitude }
    : sim.mode === "real" ? location : null;
  const isPlayer = user?.role === "player";
  const listed = views.filter((v) => filter === "all" || (filter === "free" ? v.kind === "free" : v.kind !== "free"));

  const openDetails = (monumentId: string) => router.push({ pathname: "/monuments/[monumentId]", params: { monumentId } });
  const legend = [
    ...Object.values(availabilityAppearance),
    ...(isPlayer ? [viewerHoldAppearance] : []),
    { color: theme.colors.info, label: sim.mode === "simulated" ? "Your location (simulated)" : "Your location" },
  ];

  return (
    <Screen title="Monument map" subtitle="New York City play area. Select a marker to see its status, or tap a row below.">
      <Text style={styles.summary}>{monuments.length} monuments · NYC</Text>
      <View style={styles.map}>
        <MonumentMap
          monuments={monuments}
          playerLocation={playerLocation}
          nowMs={nowMs}
          onViewDetails={openDetails}
          onStartCapture={isPlayer ? (monumentId) => router.push(`/capture?monumentId=${monumentId}`) : undefined}
        />
      </View>
      <View accessibilityLabel="Map legend" style={styles.legend}>
        {legend.map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
      {monuments.length === 0 ? <Text style={styles.message}>No monuments available in this play area yet.</Text> : null}

      {sim.mode === "simulated" ? (
        <Banner tone="info" icon="locate">{`Demo location: ${sim.label}. Change it in Profile → Demo tools.`}</Banner>
      ) : sim.mode !== "real" ? (
        <Banner tone="warning" icon="locate">{`Demo: location ${sim.mode === "denied" ? "permission denied" : "unavailable"}. You can still browse the map, but captures will be refused.`}</Banner>
      ) : (
        <>
          <Pressable accessibilityRole="button" disabled={loading} onPress={locate} style={[styles.button, loading && { opacity: 0.6 }]}>
            <Text style={styles.buttonText}>{loading ? "Finding location…" : "Show my location"}</Text>
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
        </>
      )}

      <View style={styles.chips}>
        <Chip label={`All (${views.length})`} selected={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label={`Free (${views.filter((v) => v.kind === "free").length})`} selected={filter === "free"} onPress={() => setFilter("free")} />
        <Chip label={`Held (${views.filter((v) => v.kind !== "free").length})`} selected={filter === "held"} onPress={() => setFilter("held")} />
      </View>
      {listed.length === 0 ? <Text style={styles.message}>No monuments match this filter.</Text> : null}
      {listed.map((v) => (
        <Card key={v.monument.id} onPress={() => openDetails(v.monument.id)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{v.monument.name}</Text>
            <Text style={styles.rowMeta}>{v.monument.neighborhood} · {v.statusLine}</Text>
          </View>
          <Pill kind={v.kind} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { color: theme.colors.primary, fontWeight: "700" },
  map: { borderRadius: theme.radius.medium, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.border },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.medium },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: theme.colors.text, fontSize: 13 },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.medium, padding: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  message: { color: theme.colors.muted, lineHeight: 21 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  row: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  rowMeta: { color: theme.colors.muted, marginTop: 2 },
});

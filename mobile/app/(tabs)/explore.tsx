import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { MARKER_COLORS } from "../../src/components/map/types";
import { Banner, Card, Chip, Pill } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { useCurrentUser, useDemoState, useNow } from "../../src/demo/store";
import { monumentViews, toMapMonument } from "../../src/demo/views";
import { usePlayerLocation } from "../../src/hooks/usePlayerLocation";

type Filter = "all" | "free" | "held";

export default function ExploreScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const now = useNow(5000);
  const { location, message, loading, locate } = usePlayerLocation();
  const [filter, setFilter] = useState<Filter>("all");

  const views = monumentViews(state, user?.id, now);
  const sim = state.settings.location;
  const playerLocation = sim.mode === "simulated" ? { latitude: sim.latitude, longitude: sim.longitude } : location;
  const listed = views.filter((v) => filter === "all" || (filter === "free" ? v.kind === "free" : v.kind !== "free"));
  const open = (id: string) => router.push(`/monument/${id}`);

  return (
    <Screen title="Monument map" subtitle="New York City play area. Tap a marker or a row to see who holds it.">
      <View style={styles.legend}>
        <Legend color={MARKER_COLORS.free} label="Free" />
        <Legend color={MARKER_COLORS.held} label="Held" />
        {user?.role === "player" ? <Legend color={MARKER_COLORS.mine} label="Yours" /> : null}
        <Legend color={MARKER_COLORS.player} label={sim.mode === "simulated" ? "You (simulated)" : "You"} />
      </View>

      <View style={styles.map}>
        <MonumentMap monuments={views.map(toMapMonument)} playerLocation={playerLocation} onSelect={open} />
      </View>

      {sim.mode === "simulated" ? (
        <Banner tone="info" icon="locate">{`Demo location: ${sim.label}. Change it in Profile → Demo tools.`}</Banner>
      ) : (
        <View style={styles.locateRow}>
          <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
          <Pressable accessibilityRole="button" disabled={loading} onPress={locate} style={[styles.locate, loading && { opacity: 0.6 }]}>
            <Text style={styles.locateText}>{loading ? "Finding…" : "Show my location"}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.chips}>
        <Chip label={`All (${views.length})`} selected={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label={`Free (${views.filter((v) => v.kind === "free").length})`} selected={filter === "free"} onPress={() => setFilter("free")} />
        <Chip label={`Held (${views.filter((v) => v.kind !== "free").length})`} selected={filter === "held"} onPress={() => setFilter("held")} />
      </View>

      {listed.length === 0 ? <Text style={styles.message}>No monuments match this filter.</Text> : null}
      {listed.map((v) => (
        <Card key={v.monument.id} onPress={() => open(v.monument.id)} style={styles.row}>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.medium },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendDot: { borderColor: "#ffffff", borderRadius: 7, borderWidth: 2, height: 14, width: 14 },
  legendText: { color: theme.colors.text, fontWeight: "600" },
  map: { borderColor: theme.colors.border, borderRadius: theme.radius.medium, borderWidth: 1, overflow: "hidden" },
  locateRow: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  locate: { borderColor: theme.colors.primary, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  locateText: { color: theme.colors.primary, fontWeight: "700" },
  message: { color: theme.colors.muted, flex: 1, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  row: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  rowMeta: { color: theme.colors.muted, marginTop: 2 },
});

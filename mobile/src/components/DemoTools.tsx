// Demo-only controls: fake location, fast-forward the game clock, reset data.
// None of this exists in the real product; it makes the demo runnable indoors.

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";
import { formatRemaining } from "../demo/rules";
import { demo, isPersisting, useDemoState } from "../demo/store";
import { Banner, Button, Card, Chip } from "./ui";

const FAR_AWAY = { latitude: 40.758, longitude: -73.9855, label: "in Times Square (far from monuments)" };

export function DemoTools() {
  const state = useDemoState();
  const loc = state.settings.location;
  const offset = state.settings.clockOffsetMs;
  const activeMonuments = state.monuments.filter((m) => m.active);

  const isAt = (lat: number, lng: number) => loc.mode === "simulated" && !loc.monumentId && loc.latitude === lat && loc.longitude === lng;

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>Demo tools</Text>

      <Text style={styles.label}>Location</Text>
      <View style={styles.wrap}>
        <Chip label="Real GPS" selected={loc.mode === "real"} onPress={() => demo.setLocation({ mode: "real" })} />
        <Chip
          label="Far away"
          selected={isAt(FAR_AWAY.latitude, FAR_AWAY.longitude)}
          onPress={() => demo.setLocation({ mode: "simulated", accuracyMeters: 8, ...FAR_AWAY })}
        />
      </View>
      <Text style={styles.hint}>Or stand at a monument:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {activeMonuments.map((m) => (
          <Chip
            key={m.id}
            label={m.name}
            selected={loc.mode === "simulated" && loc.monumentId === m.id}
            onPress={() => demo.teleportTo(m, loc.mode === "simulated" ? loc.accuracyMeters : 8)}
          />
        ))}
      </ScrollView>
      {loc.mode === "simulated" ? (
        <>
          <Text style={styles.hint}>GPS accuracy:</Text>
          <View style={styles.wrap}>
            <Chip label="Good (±8 m)" selected={loc.accuracyMeters <= 50} onPress={() => demo.setLocation({ ...loc, accuracyMeters: 8, label: loc.label.replace(" (poor GPS)", "") })} />
            <Chip label="Poor (±120 m)" selected={loc.accuracyMeters > 50} onPress={() => demo.setLocation({ ...loc, accuracyMeters: 120, label: loc.label.replace(" (poor GPS)", "") + " (poor GPS)" })} />
          </View>
          <Text style={styles.status}>{`Simulated position ${loc.label}, ±${loc.accuracyMeters} m.`}</Text>
        </>
      ) : (
        <Text style={styles.status}>Using this device's real location.</Text>
      )}

      <Text style={styles.label}>Game clock</Text>
      <Text style={styles.status}>
        {offset === 0 ? "Running in real time." : `Fast-forwarded by ${formatRemaining(offset)}. Locks expire sooner.`}
      </Text>
      <View style={styles.wrap}>
        <Button compact variant="ghost" icon="play-forward-outline" label="+15 min" onPress={() => demo.advanceClock(15 * 60_000)} />
        <Button compact variant="ghost" icon="play-skip-forward-outline" label="+1 hour" onPress={() => demo.advanceClock(60 * 60_000)} />
        {offset !== 0 ? <Button compact variant="ghost" icon="refresh" label="Real time" onPress={() => demo.resetClock()} /> : null}
      </View>

      <Text style={styles.label}>Data</Text>
      {!isPersisting() ? (
        <Banner tone="warning">Browser storage is full or blocked, so changes will be lost on refresh.</Banner>
      ) : null}
      <Button compact variant="ghost" icon="trash-outline" label="Reset demo data" onPress={() => demo.reset()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderStyle: "dashed", gap: 10 },
  heading: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  label: { color: theme.colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 6, textTransform: "uppercase" },
  hint: { color: theme.colors.muted },
  status: { color: theme.colors.text, lineHeight: 20 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  row: { gap: theme.spacing.small, paddingVertical: 2 },
});

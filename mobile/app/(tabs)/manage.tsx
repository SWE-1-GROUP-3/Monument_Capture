import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Button, Card, Pill } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { demo, useCurrentUser, useDemoState, useNow } from "../../src/demo/store";
import { monumentViews } from "../../src/demo/views";

export default function ManageMonumentsScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const now = useNow(10_000);
  const views = monumentViews(state, user?.id, now, true).sort((a, b) => Number(b.monument.active) - Number(a.monument.active));
  const activeCount = views.filter((v) => v.monument.active).length;

  return (
    <Screen title="Monuments" subtitle={`${activeCount} active in the NYC play area. Deactivated monuments disappear from the map but keep their history.`}>
      <Button label="Add monument" icon="add" onPress={() => router.push("/manage-monument/new")} />
      {views.map(({ monument, kind, statusLine }) => (
        <Card key={monument.id}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !monument.active && { color: theme.colors.muted }]}>{monument.name}</Text>
              <Text style={styles.meta}>{monument.neighborhood} · radius {monument.captureRadiusMeters} m</Text>
              <Text style={styles.meta}>{statusLine}</Text>
            </View>
            <Pill kind={kind} />
          </View>
          <View style={styles.actions}>
            <Button compact variant="secondary" icon="create-outline" label="Edit" onPress={() => router.push(`/manage-monument/${monument.id}`)} />
            <Button
              compact
              variant="ghost"
              icon={monument.active ? "eye-off-outline" : "eye-outline"}
              label={monument.active ? "Deactivate" : "Reactivate"}
              onPress={() => demo.setMonumentActive(monument.id, !monument.active)}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.medium },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: theme.colors.muted, marginTop: 2 },
  actions: { flexDirection: "row", gap: theme.spacing.small, marginTop: 4 },
});

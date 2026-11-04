// Native fallback. The map-first redesign targets the web demo (it relies on
// Leaflet and CSS); on iOS/Android this shows the store-backed map and the
// key actions as simple buttons.
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MonumentMap } from "../components/map/MonumentMap";
import { Screen } from "../components/Screen";
import { Button } from "../components/ui";
import { theme } from "../constants/theme";
import { demo, useDemoState } from "../demo/store";
import { monumentViews, toMapMonument } from "../demo/views";
import { useStatusTime } from "../hooks/useStatusTime";
import type { GameHomeProps } from "./types";

export function GameHome({ user }: GameHomeProps) {
  const state = useDemoState();
  const nowMs = useStatusTime();
  const views = monumentViews(state, user.id, nowMs);
  return (
    <Screen title="Monument map" subtitle="The full map-first layout runs in the web demo.">
      <View style={styles.map}>
        <MonumentMap
          monuments={views.map(toMapMonument)}
          playerLocation={null}
          nowMs={nowMs}
          onViewDetails={(id) => router.push({ pathname: "/monuments/[monumentId]", params: { monumentId: id } })}
          onStartCapture={user.role === "player" ? (id) => router.push(`/capture?monumentId=${id}`) : undefined}
        />
      </View>
      <Text style={styles.note}>Signed in as {user.name}.</Text>
      <Button label="Sign out" variant="dark" onPress={() => { demo.logout(); router.replace("/login"); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { borderColor: theme.colors.line, borderRadius: theme.radius.large, borderWidth: 2, overflow: "hidden" },
  note: { color: theme.colors.muted },
});

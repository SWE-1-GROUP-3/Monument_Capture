import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { theme } from "../../constants/theme";
import { getMonumentAvailability } from "../../utils/monumentAvailability";
import { getValidMonuments, isValidCoordinate } from "../../utils/mapData";
import { availabilityAppearance } from "./availabilityAppearance";
import { MonumentActions } from "./MonumentActions";
import { NYC_REGION, type MonumentMapProps } from "./types";

export function MonumentMap({ monuments, playerLocation, nowMs, onViewDetails }: MonumentMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const validMonuments = getValidMonuments(monuments);
  const selected = validMonuments.find(monument => monument.id === selectedId);
  const selectedStatus = selected ? getMonumentAvailability(selected, nowMs).status : null;

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={NYC_REGION} onMarkerPress={(event) => {
        // Use the SDK's marker ID as the single source of selection, independent of clock renders.
        const id = event.nativeEvent.id;
        if (typeof id !== "string" || id === "player-location" || !validMonuments.some(monument => monument.id === id)) return;
        setSelectedId(id);
      }}>
        {validMonuments.map((monument) => {
          const { status } = getMonumentAvailability(monument, nowMs);
          const appearance = availabilityAppearance[status];
          return (
            <Marker key={monument.id} identifier={monument.id} coordinate={monument}
              accessibilityLabel={`${monument.name}: ${appearance.label}`} pinColor={appearance.color} />
          );
        })}
        {isValidCoordinate(playerLocation) ? (
          <Marker identifier="player-location" coordinate={playerLocation} title="Your location" pinColor="blue" />
        ) : null}
      </MapView>
      {selected && selectedStatus ? (
        <View style={styles.card} accessibilityLabel="Selected monument">
          <View style={styles.heading}>
            <Text style={styles.name}>{selected.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss monument actions"
              onPress={() => setSelectedId(null)} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.status}>{availabilityAppearance[selectedStatus].description}</Text>
          <MonumentActions available={selectedStatus === "available"} onViewDetails={() => onViewDetails(selected.id)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: 420 },
  card: { position: "absolute", bottom: 8, left: 8, right: 8, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, padding: 12, gap: 8 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, color: theme.colors.text, fontWeight: "700", fontSize: 15 },
  status: { color: theme.colors.text, fontSize: 14 },
  close: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  closeText: { color: theme.colors.muted, fontSize: 24 },
});

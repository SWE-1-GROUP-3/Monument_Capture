import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { StartCapturePlaceholder } from "../../src/components/StartCapturePlaceholder";
import { Screen } from "../../src/components/Screen";
import { availabilityAppearance } from "../../src/components/map/availabilityAppearance";
import { theme } from "../../src/constants/theme";
import { mapMonuments } from "../../src/data/mapMonuments";
import { useStatusTime } from "../../src/hooks/useStatusTime";
import { formatLockTime } from "../../src/utils/formatLockTime";
import { getMonumentAvailability } from "../../src/utils/monumentAvailability";

export default function MonumentDetailsScreen() {
  const { monumentId } = useLocalSearchParams<{ monumentId?: string | string[] }>();
  const nowMs = useStatusTime();
  // Route parameters identify the shared record; never trust copied status in a URL.
  const monument = typeof monumentId === "string" ? mapMonuments.find(item => item.id === monumentId) : undefined;

  if (!monument) {
    return <Screen title="Monument not found" subtitle="This monument is not in the prototype data. Use Back to map to choose a monument." />;
  }

  const availability = getMonumentAvailability(monument, nowMs);
  const appearance = availabilityAppearance[availability.status];
  return (
    <Screen title={monument.name}>
      <View style={styles.card}>
        <Text style={[styles.status, { color: appearance.color }]}>{appearance.description}</Text>
        {availability.status === "locked" ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Held by</Text>
              <Text style={styles.value}>{availability.holderDisplayName}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Remaining lock time</Text>
              <Text style={styles.value}>{formatLockTime(availability.remainingMs)}</Text>
            </View>
          </>
        ) : null}
        {availability.status === "unknown" ? <Text style={styles.explanation}>Availability could not be determined.</Text> : null}
      </View>
      <StartCapturePlaceholder />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.large, padding: theme.spacing.large, gap: theme.spacing.large },
  status: { fontSize: 18, fontWeight: "700" },
  field: { gap: theme.spacing.small },
  label: { color: theme.colors.muted, fontSize: 14 },
  value: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  explanation: { color: theme.colors.muted, lineHeight: 21 },
});

import { StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";

type InfoCardProps = {
  label: string;
  value: string;
};

export function InfoCard({ label, value }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  value: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  label: { color: theme.colors.muted, fontSize: 11, marginTop: 4, textAlign: "center" },
});

import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../constants/theme";

export function BackToMapButton() {
  return (
    <Pressable accessibilityRole="button" onPress={() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/explore");
    }} style={styles.button}>
      <Text style={styles.text}>Back to map</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 8, paddingRight: 12 },
  text: { color: theme.colors.primary, fontWeight: "700" },
});

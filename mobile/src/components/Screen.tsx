import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../constants/theme";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Shows a back link. Falls back to `backTo` when there is no history (e.g. after a page refresh). */
  back?: boolean;
  backTo?: string;
}>;

export function Screen({ children, subtitle, title, back, backTo = "/" }: ScreenProps) {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(backTo as never);
  };
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {back ? (
            <Pressable accessibilityRole="link" onPress={goBack} style={styles.back}>
              <Ionicons color={theme.colors.primary} name="chevron-back" size={20} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: theme.colors.background, flex: 1 },
  content: {
    alignItems: "center",
    padding: theme.spacing.large,
    paddingBottom: 40,
  },
  // Keeps the layout phone-shaped when the demo runs in a desktop browser.
  column: { gap: theme.spacing.large, maxWidth: 720, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 2, marginBottom: -8 },
  backText: { color: theme.colors.primary, fontSize: 16, fontWeight: "700" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: theme.colors.muted, fontSize: 15, lineHeight: 21, marginTop: 6 },
});

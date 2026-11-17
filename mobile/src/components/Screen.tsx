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
  backLabel?: string;
}>;

/**
 * Full screens (capture flow, review, monument editor, login) styled like the
 * map's bottom sheets: a white card with 26px top corners and a grab handle,
 * centred and at most 560px wide.
 */
export function Screen({ children, subtitle, title, back, backTo = "/", backLabel = "Back" }: ScreenProps) {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(backTo as never);
  };
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.sheet}>
          <View style={styles.grab} />
          {back ? (
            <Pressable accessibilityRole="link" onPress={goBack} style={styles.back}>
              <Text style={styles.backText}>‹ {backLabel}</Text>
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
  safeArea: { backgroundColor: "#cfe9d6", flex: 1 },
  content: { alignItems: "center", flexGrow: 1, justifyContent: "flex-end", paddingTop: 24 },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    flexGrow: 1,
    gap: theme.spacing.large,
    maxWidth: 560,
    paddingBottom: 40,
    paddingHorizontal: theme.spacing.large,
    paddingTop: 10,
    width: "100%",
  },
  grab: { alignSelf: "center", backgroundColor: theme.colors.line, borderRadius: 9, height: 5, marginBottom: -8, width: 44 },
  back: { alignSelf: "flex-start", marginBottom: -12 },
  backText: { color: theme.colors.brandDark, fontSize: 16, fontWeight: "800" },
  title: { color: theme.colors.ink, fontSize: 26, fontWeight: "800", lineHeight: 30 },
  subtitle: { color: theme.colors.muted, fontSize: 15, lineHeight: 21, marginTop: 4 },
});

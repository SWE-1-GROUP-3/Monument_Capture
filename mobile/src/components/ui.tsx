// Small shared UI building blocks for the review screens.
// Note: react-native's Alert does nothing on web, so feedback is shown inline with <Banner>.

import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../constants/theme";
import { STATUS_LABEL } from "../review/captureReview";
import type { CaptureStatus } from "../review/types";

type IconName = ComponentProps<typeof Ionicons>["name"];
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: theme.colors.primary, fg: "#ffffff", border: theme.colors.primary },
  secondary: { bg: theme.colors.surface, fg: theme.colors.primary, border: theme.colors.primary },
  danger: { bg: theme.colors.danger, fg: "#ffffff", border: theme.colors.danger },
  ghost: { bg: "transparent", fg: theme.colors.muted, border: theme.colors.border },
};

export function Button({ label, onPress, icon, variant = "primary", disabled, style }: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon ? <Ionicons color={v.fg} name={icon} size={20} /> : null}
      <Text style={[styles.buttonText, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: theme.colors.infoSoft, fg: theme.colors.info, icon: "information-circle" },
  success: { bg: theme.colors.primarySoft, fg: theme.colors.primary, icon: "checkmark-circle" },
  warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning, icon: "alert-circle" },
  danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger, icon: "close-circle" },
};

export function Banner({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const t = tones[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: t.bg }]}>
      <Ionicons color={t.fg} name={t.icon} size={22} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={[styles.bannerTitle, { color: t.fg }]}>{title}</Text> : null}
        {typeof children === "string" ? <Text style={styles.bannerText}>{children}</Text> : children}
      </View>
    </View>
  );
}

const statusColors: Record<CaptureStatus, { bg: string; fg: string }> = {
  pending: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
  approved: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
  rejected: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
};

/** Capture status badge: Pending Review, Approved or Rejected. */
export function StatusPill({ status }: { status: CaptureStatus }) {
  const c = statusColors[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons color={theme.colors.muted} name={icon} size={32} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center", borderRadius: theme.radius.medium, borderWidth: 1, flexDirection: "row",
    gap: theme.spacing.small, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 14,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.medium,
    borderWidth: 1, gap: theme.spacing.small, padding: theme.spacing.medium,
  },
  banner: { alignItems: "flex-start", borderRadius: theme.radius.medium, flexDirection: "row", gap: theme.spacing.medium, padding: theme.spacing.medium },
  bannerTitle: { fontSize: 15, fontWeight: "800" },
  bannerText: { color: theme.colors.text, lineHeight: 20 },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: "800" },
  detailRow: { flexDirection: "row", gap: theme.spacing.medium, justifyContent: "space-between", paddingVertical: 4 },
  detailLabel: { color: theme.colors.muted, flexShrink: 0 },
  detailValue: { color: theme.colors.text, flex: 1, fontWeight: "700", textAlign: "right" },
  empty: { alignItems: "center", gap: 6, padding: theme.spacing.large },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: theme.colors.muted, lineHeight: 20, textAlign: "center" },
  chip: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontWeight: "600" },
  chipTextSelected: { color: "#ffffff" },
});

// Small shared UI building blocks used across the demo screens.
// Note: react-native's Alert does nothing on web, so the demo shows all
// feedback inline with <Banner> instead.

import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../constants/theme";
import type { CaptureStatus } from "../demo/types";

type IconName = ComponentProps<typeof Ionicons>["name"];

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "dark";

export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const down = pressed && !disabled;
        const edge = disabled ? theme.colors.disabledDark : v.edge;
        return [
          styles.button,
          compact && styles.buttonCompact,
          { backgroundColor: disabled ? theme.colors.disabled : v.bg, borderColor: disabled ? theme.colors.disabled : v.border },
          // Chunky game button: a darker bottom edge that compresses on press.
          { boxShadow: `0 ${down ? 2 : compact ? 3 : 4}px 0 ${edge}`, transform: [{ translateY: down ? 2 : 0 }] } as object,
          style,
        ];
      }}
    >
      {icon ? <Ionicons color={v.fg} name={icon} size={compact ? 16 : 20} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: disabled && variant !== "ghost" ? "#ffffff" : v.fg }]}>{label}</Text>
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string; edge: string }> = {
  primary: { bg: theme.colors.brand, fg: "#ffffff", border: theme.colors.brand, edge: theme.colors.brandDark },
  secondary: { bg: theme.colors.card, fg: theme.colors.ink, border: theme.colors.line, edge: theme.colors.line },
  danger: { bg: theme.colors.danger, fg: "#ffffff", border: theme.colors.danger, edge: "#a83232" },
  ghost: { bg: theme.colors.card, fg: theme.colors.muted, border: theme.colors.line, edge: theme.colors.line },
  dark: { bg: theme.colors.ink, fg: "#ffffff", border: theme.colors.ink, edge: theme.colors.inkDark },
};

// ---------- Card ----------

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

// ---------- Banner ----------

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: theme.colors.infoSoft, fg: theme.colors.info, icon: "information-circle" },
  success: { bg: theme.colors.primarySoft, fg: theme.colors.primary, icon: "checkmark-circle" },
  warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning, icon: "alert-circle" },
  danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger, icon: "close-circle" },
};

export function Banner({ tone = "info", title, children, icon }: { tone?: Tone; title?: string; children?: ReactNode; icon?: IconName }) {
  const t = tones[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: t.bg }]}>
      <Ionicons color={t.fg} name={icon ?? t.icon} size={22} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={[styles.bannerTitle, { color: t.fg }]}>{title}</Text> : null}
        {typeof children === "string" ? <Text style={styles.bannerText}>{children}</Text> : children}
      </View>
    </View>
  );
}

// ---------- Pills ----------

export type HoldKind = "free" | "held" | "mine" | "inactive";

const holdPill: Record<HoldKind, { label: string; bg: string; fg: string }> = {
  free: { label: "Free to claim", bg: theme.colors.free, fg: "#ffffff" },
  held: { label: "Held", bg: theme.colors.held, fg: "#ffffff" },
  mine: { label: "Yours", bg: theme.colors.mine, fg: "#ffffff" },
  inactive: { label: "Inactive", bg: "#eef0ec", fg: theme.colors.muted },
};

const capturePill: Record<CaptureStatus, { label: string; bg: string; fg: string }> = {
  in_progress: { label: "In progress", bg: theme.colors.infoSoft, fg: theme.colors.info },
  pending: { label: "Pending review", bg: theme.colors.warningSoft, fg: theme.colors.warning },
  approved: { label: "Approved", bg: theme.colors.primarySoft, fg: theme.colors.primary },
  rejected: { label: "Rejected", bg: theme.colors.dangerSoft, fg: theme.colors.danger },
};

export function Pill({ kind, label }: { kind: HoldKind | { capture: CaptureStatus }; label?: string }) {
  const p = typeof kind === "string" ? holdPill[kind] : capturePill[kind.capture];
  return (
    <View style={[styles.pill, { backgroundColor: p.bg }]}>
      <Text style={[styles.pillText, { color: p.fg }]}>{label ?? p.label}</Text>
    </View>
  );
}

// ---------- Misc ----------

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          tone === "danger" && { color: theme.colors.danger },
          tone === "warning" && { color: theme.colors.warning },
        ]}
      >
        {value}
      </Text>
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
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    gap: theme.spacing.small,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonCompact: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  buttonText: { fontSize: 17, fontWeight: "800" },
  buttonTextCompact: { fontSize: 14 },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 2,
    gap: theme.spacing.small,
    padding: theme.spacing.medium,
  },
  banner: {
    alignItems: "flex-start",
    borderRadius: theme.radius.medium,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.medium,
  },
  bannerTitle: { fontSize: 15, fontWeight: "800" },
  bannerText: { color: theme.colors.text, lineHeight: 20 },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: "800" },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  detailRow: { flexDirection: "row", gap: theme.spacing.medium, justifyContent: "space-between", paddingVertical: 4 },
  detailLabel: { color: theme.colors.muted, flexShrink: 0 },
  detailValue: { color: theme.colors.text, flex: 1, fontWeight: "700", textAlign: "right" },
  empty: { alignItems: "center", gap: 6, padding: theme.spacing.large },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: theme.colors.muted, lineHeight: 20, textAlign: "center" },
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  chipText: { color: theme.colors.text, fontWeight: "700" },
  chipTextSelected: { color: "#ffffff" },
});

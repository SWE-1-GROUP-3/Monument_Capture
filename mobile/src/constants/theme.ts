// Monument Capture visual language (map-first redesign).
// The original keys are kept and point at the new palette, so older screens
// pick up the new look without code changes.

const palette = {
  ink: "#17323a",
  muted: "#5d7780",
  line: "#e3ece9",
  card: "#ffffff",
  brand: "#16a37f",
  brandDark: "#0d7a5f",
  brandLight: "#2fd4a6",
  free: "#2f80ed",
  held: "#e8590c",
  mine: "#7c3aed",
  levelYellow: "#ffd23f",
} as const;

export const theme = {
  colors: {
    ...palette,
    // Original keys, mapped onto the new palette.
    background: "#f4f8f7",
    border: palette.line,
    muted: palette.muted,
    primary: palette.brand,
    primarySoft: "#e3f6ee",
    surface: palette.card,
    text: palette.ink,
    tile: "#f2f8f6",
    warning: "#9a6512",
    warningSoft: "#fff4d6",
    danger: "#d64545",
    dangerSoft: "#fde8e8",
    info: palette.free,
    infoSoft: "#e7f0fd",
    heldSoft: "#fdeee5",
    mineSoft: "#f1eafe",
    disabled: "#b7c7c3",
    disabledDark: "#94a8a3",
    inkDark: "#0b1c21",
  },
  radius: {
    small: 12,
    medium: 16,
    large: 18,
    sheet: 26,
  },
  spacing: {
    small: 8,
    medium: 14,
    large: 20,
  },
  fontFamily: '"Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

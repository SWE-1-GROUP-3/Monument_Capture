export const theme = {
  colors: {
    background: "#f7f8f5",
    border: "#dfe5dc",
    muted: "#66756a",
    primary: "#176b47",
    primarySoft: "#e4f2e9",
    surface: "#ffffff",
    text: "#17231c",
    warning: "#9a6512",
    warningSoft: "#fbf1df",
    danger: "#b42318",
    dangerSoft: "#fdecea",
    info: "#2563eb",
    infoSoft: "#e8effd",
    /** Map/status colour for a monument held by someone else. */
    held: "#c2410c",
    heldSoft: "#fdeee5",
    /** Map/status colour for a monument held by the signed-in player. */
    mine: "#7c3aed",
    mineSoft: "#f1eafe",
  },
  radius: {
    medium: 14,
    large: 20,
  },
  spacing: {
    small: 8,
    medium: 14,
    large: 22,
  },
} as const;

import { theme } from "../../constants/theme";

// Presentation only; availability rules stay in getMonumentAvailability.
export const availabilityAppearance = {
  available: { color: theme.colors.primary, label: "Available", description: "Available to capture" },
  locked: { color: theme.colors.warning, label: "Locked", description: "Locked" },
  unknown: { color: theme.colors.muted, label: "Status unknown", description: "Status unknown" },
} as const;

/** Locked by the signed-in player. Same "Locked" status, different colour. */
export const viewerHoldAppearance = { color: theme.colors.mine, label: "Yours" } as const;

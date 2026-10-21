import { colors, typography } from "../tokens";

/** Provisional Veriq theme. Replace with approved Figma theme values. */
export const veriqTheme = {
  name: "veriq",
  colors: { ...colors.foundation, accent: colors.foundation.slate700 },
  typography: typography.fontFamily.sans,
} as const;

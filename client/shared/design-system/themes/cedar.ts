import { colors, typography } from "../tokens";

/** Provisional Cedar theme. Replace with approved Figma theme values. */
export const cedarTheme = {
  name: "cedar",
  colors: { ...colors.foundation, accent: colors.foundation.slate700 },
  typography: typography.fontFamily.sans,
} as const;

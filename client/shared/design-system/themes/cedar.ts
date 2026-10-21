import { colors, typography } from "../tokens";

/** Provisional Cedar theme. Replace with approved Figma theme values. */
export const cedarTheme = {
  name: "cedar",
  approval: "pending-design-approval",
  colors: {
    background: "PENDING_DESIGN_APPROVAL",
    surface: "PENDING_DESIGN_APPROVAL",
    text: "PENDING_DESIGN_APPROVAL",
    accent: "PENDING_DESIGN_APPROVAL",
    status: colors.status,
  },
  typography: typography.family.cedar,
} as const;

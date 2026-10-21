/**
 * Provisional design tokens. Replace values with approved Figma variables.
 * Product identity belongs in themes/, not in application components.
 */
export const colors = {
  foundation: {
    white: "#ffffff",
    black: "#000000",
    slate50: "#f8fafc",
    slate100: "#f1f5f9",
    slate200: "#e2e8f0",
    slate500: "#64748b",
    slate700: "#334155",
    slate900: "#0f172a",
  },
  semantic: {
    success: "#15803d",
    warning: "#a16207",
    danger: "#b91c1c",
    info: "#0369a1",
    unknown: "#64748b",
  },
} as const;

export type DesignSystemColors = typeof colors;

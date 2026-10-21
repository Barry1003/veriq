/**
 * Verified provisional Veriq specimen tokens from the Codex handoff.
 * These are not final brand approvals and must not be treated as Cedar colors.
 */
export const colors = {
  background: { app: "#F7FAFA", surface: "#FFFFFF", subtle: "#F0F5F5" },
  action: { primary: "#0A716E", primaryHover: "#085B5B", secondary: "#E1F5F1" },
  text: { primary: "#102B35", secondary: "#536A73", tertiary: "#8CA1A9", onPrimary: "#FFFFFF" },
  border: { default: "#DBE5E7" },
  status: {
    success: "#177F55", successBackground: "#E2F6EA",
    info: "#2F66C6", infoBackground: "#EAF0FF",
    warning: "#996119", warningBackground: "#FFF2D8",
    danger: "#B83D50", dangerBackground: "#FCE8EC",
  },
} as const;

export type DesignSystemColors = typeof colors;

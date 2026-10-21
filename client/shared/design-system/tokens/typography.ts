/** Provisional typography scale; final families and sizes come from Figma. */
export const typography = {
  fontFamily: {
    sans: "Arial, Helvetica, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    display: "2rem",
  },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.625 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

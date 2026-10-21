/** Verified provisional Veriq typography specimens. Cedar typography is pending. */
export const typography = {
  family: { veriq: "Inter", cedar: "PENDING_DESIGN_APPROVAL", mono: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  styles: {
    displayXl: { family: "Inter", weight: 700, fontSizePx: 40, lineHeightPx: 48 },
    pageHeading: { family: "Inter", weight: 700, fontSizePx: 28, lineHeightPx: 36 },
    sectionHeading: { family: "Inter", weight: 600, fontSizePx: 22, lineHeightPx: 30 },
    cardHeading: { family: "Inter", weight: 600, fontSizePx: 18, lineHeightPx: 26 },
    bodyLarge: { family: "Inter", weight: 400, fontSizePx: 16, lineHeightPx: 24 },
    bodyBase: { family: "Inter", weight: 400, fontSizePx: 14, lineHeightPx: 22 },
    bodyStrong: { family: "Inter", weight: 600, fontSizePx: 14, lineHeightPx: 22 },
    controlLabel: { family: "Inter", weight: 500, fontSizePx: 14, lineHeightPx: 20 },
    metadata: { family: "Inter", weight: 500, fontSizePx: 12, lineHeightPx: 16 },
  },
} as const;

# Shared design system

This directory is the shared design-system contract for Veriq and Cedar.

- `tokens/` Primitive design values. colors.ts holds palette values; spacing.ts handles spacing scales; typography.ts handles font scales and weights; breakpoints.ts handles responsive thresholds.

- `themes/` Maps shared and semantic tokens to each product's visual identity. veriq.ts and cedar.ts keep brand-specific decisions separate.

- `components/` is reserved for approved reusable primitives and interaction patterns.
- `layouts/` is reserved for approved cross-product layout compositions.
- `styles/` contains shared CSS conventions.
- `icons/` is the central Lucide entry point.
- `utils/` contains dependency-light shared helpers.

Token values are provisional until approved Figma variables are available. Do not implement product screens or speculative variants here.

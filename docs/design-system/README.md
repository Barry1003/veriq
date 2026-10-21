# Design-system integration

`client/shared/design-system` is the single source for shared foundations and product theme layers. Foundation tokens define structural contracts; Veriq and Cedar theme files provide independent product namespaces. Approved Figma variables should replace provisional values without changing feature boundaries. The individual Next.js apps keep their root styles local because Turbopack does not permit CSS imports outside an app root; future approved primitives should consume these tokens through an explicit shared package boundary.

Shared primitives should be added only after a Figma component is approved. They must support keyboard focus, disabled/loading/error states, and non-color status cues. Lucide is the preferred icon convention because both apps already depend on it.

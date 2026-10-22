# Veriq repository engineering instructions

These instructions apply to Codex work in this repository. They describe project-wide engineering expectations; nested `AGENTS.md` files add scoped instructions and must be preserved.

## Product boundaries

Veriq is an institutional intelligence platform with three connected pillars:

- Institutional knowledge intelligence: services, systems, relationships, dependencies, and change over time.
- Operational intelligence: operational events, failures, dependencies, and service behavior.
- Customer experience intelligence: customer-reported experiences, transaction issues, and complaints.

These pillars support evidence-based investigations. Keep observations, correlations, hypotheses, and verified findings distinct. Never present an unverified relationship as confirmed causation or remove a foundational product capability for a scripted demonstration.

Cedar is a separate fictional banking environment for customer banking, transactions, transfers, complaints, staff operations, and authorized integration with Veriq. Keep the products' business logic, navigation, data ownership, authentication assumptions, and permissions separate. Shared UI foundations do not imply shared business access.

## Ownership boundaries

- Daniel owns the FastAPI backend, persistence, backend architecture, integration logic, and AI/intelligence mechanisms.
- Usaamah owns frontend and design. Frontend work covers Veriq and Cedar application architecture, UI, design-system implementation, accessibility, frontend state, mock data, and frontend/API integration.

Do not modify backend implementation files during frontend tasks or independently implement AI mechanisms. Do not invent backend endpoints, payloads, authentication behavior, or security guarantees. If a backend or AI dependency is missing, document it and identify what the responsible owner must confirm.

## Repository architecture

The repository contains two independent Next.js applications:

- `client/veriq/`
- `client/cedar/`

Shared design foundations live in `client/shared/design-system/`. Use one shared component foundation with separate Veriq and Cedar themes. Product-specific layouts, feature components, navigation, and data remain in the owning application. Do not add a duplicate shared component or a new abstraction without a concrete reuse case.

The authoritative backend project lives in `server/platform/` and is out of scope for frontend changes. Preserve its files and behavior.

Follow the Next.js version and local framework guidance. In particular, preserve and obey `client/cedar/AGENTS.md`; do not overwrite or delete it. Inspect the relevant documentation under the installed Next.js package before using unfamiliar framework APIs.

## Design and Figma workflow

Codex does not need direct Figma access. Do not request Figma credentials, connect Figma tools, or block ordinary development because Figma is unavailable. Use supplied handoff documents such as `veriq_codex_figma_handoff.md` and `veriq_provisional_design_tokens.json` when provided.

The workflow is:

**Discuss → Design in Figma → Review → Approve → Implement in code**

Approved specifications take precedence over generic design assumptions. Keep provisional tokens identifiable as provisional, do not invent final branding or component behavior, and do not treat Figma Make JSX as production code. Explain material differences between a prototype and its production implementation.

Use centralized semantic design tokens. Prefer names such as `background.app`, `background.surface`, `text.primary`, `text.secondary`, `action.primary`, `border.default`, and `status.success`. Status meaning must not rely on color alone. Do not create a second token system.

## Code quality

Prioritize correctness, readability, maintainability, simplicity, strict TypeScript, accessibility, testability, and consistency.

- Use descriptive names and small focused components.
- Keep business logic separate from presentation.
- Define clear component props and implement relevant states.
- Reuse existing project patterns and shared components where appropriate.
- Avoid broad `any`, unnecessary assertions, giant components, duplicate utilities, circular dependencies, dead code, unused imports/dependencies, unexplained magic values, unnecessary effects or state libraries, silent errors, fake API responses, and invented business records.
- Add comments only for important decisions, constraints, trade-offs, or non-obvious behavior.
- Prefer the simplest understandable implementation.

Before a substantial change: inspect the relevant code, identify the objective and affected files, choose the simplest safe approach, consider dependencies and risks, implement only the requested scope, verify it, and report the result. Do not refactor unrelated areas.

## Mock data and data access

All Veriq mock data belongs in `client/veriq/src/data/`. All Cedar mock data belongs in `client/cedar/src/data/`. Keep records synthetic, typed, and internally consistent. Do not place business records in UI components.

Use this dependency flow:

**UI → Hooks/Queries → Services → Adapters → Mock data or real API**

Components must not import mock datasets directly. Keep service interfaces typed and replaceable. Use mock data during frontend development, and switch to real responses only when backend contracts are agreed. Never fabricate integration success or claim an API is complete when it is mocked.

## Git and change scope

Do not push directly to `main`. For substantial work, prefer a focused branch and meaningful commits; do not manufacture history or claim authorship that did not occur. Keep changes reviewable and unrelated files out of the change.

Do not perform destructive operations without confirming the exact target and preserving user work. Do not commit secrets or real customer/banking data. Use environment variables for configuration. Frontend visibility or route guards are not sufficient authorization for protected functionality; enforcement belongs in the backend.

## Documentation

Keep stable setup, architecture, integration, and security guidance documented. Do not update README files for routine bug fixes, small style changes, internal renames, or minor refactors. Update existing documentation when a change materially affects setup, environment configuration, public interfaces, or architectural boundaries. Do not create a report Markdown file unless requested or genuinely necessary.

`AGENTS.md` files are permanent engineering instructions and must remain tracked. Do not add them to `.gitignore` or rewrite them during ordinary implementation tasks. Update them only when project-wide conventions or architectural policies change.

## Verification and reporting

Run checks relevant to the change: TypeScript, ESLint, tests, builds, accessibility, responsive behavior, and meaningful loading/empty/error states. Never claim a check passed unless it actually ran. Investigate failures rather than suppressing them, and state exactly what could not be verified.

For significant changes, report the objective, existing implementation, affected files, approach, verification, and unresolved issues. Keep reports short and technically honest. The development team must be able to explain what the code does, why it belongs where it does, how data flows, how errors are handled, and how it is tested.

# Repository Working Rules

## UI Baseline (Locked for this repo)

- Radix model: `@radix-ui/themes` (Themes-first).
- Styling model: vanilla CSS in `app/globals.css` + scoped `className` usage.
- Primary reference: [`docs/engineering/ui-engineering-playbook.md`](docs/engineering/ui-engineering-playbook.md)

## Mandatory UI Architecture Rules

- Keep authenticated shell without full-page scrolling; use bounded local scroll regions.
- All user-facing strings must come from `src/shared/i18n/messages/`.
- Use design tokens from `app/globals.css`; do not add one-off hardcoded colors/radius/spacing/shadows/z-index in feature code.
- Repeated UI patterns (2+ usages) must be promoted to `src/shared/ui/components/` or `src/shared/ui/shells/`.

## Radix Usage Rules

- Prefer shared UI contracts over raw Radix in feature code.
- For new/touched feature files: do not add a new direct `@radix-ui/*` import when shared equivalent exists.
- Direct Radix imports are expected in `app/**` and `src/shared/ui/**`.
- Style state via className + Radix `data-*` attributes; avoid fragile deep DOM selectors.
- Do not introduce `unstable_*` Radix APIs into shared UI contracts.

## Composition and Accessibility Rules

- `asChild` is allowed only when child components forward refs, spread props, and remain focusable.
- Icon-only controls must include `aria-label`.
- Interactive primitives must be keyboard reachable.

## Quality Gate before completing UI tasks

- `npm run lint`
- `npm run typecheck`

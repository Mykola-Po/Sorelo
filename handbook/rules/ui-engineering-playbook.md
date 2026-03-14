# UI Engineering Playbook (Sorelo: Radix Themes + Vanilla CSS)

This playbook is the persistent engineering standard for building and scaling Sorelo UI.

Use it as the default reference for implementation, code review, and onboarding.

## 0) Repository Decisions (Locked)

- Component model: **Radix Themes first** (`@radix-ui/themes`), with Radix behavior contracts.
- Styling stack: **vanilla global CSS** in `app/globals.css` + scoped class names.
- Theme root: centralized in `app/layout.tsx` (`<Theme ...>`).
- Scrolling should be intentional per surface, preserving context and interaction clarity.

These choices are intentional for predictability and scale. Do not mix in Tailwind/CSS-in-JS/CSS Modules for shared UI architecture without an explicit architecture decision.

## 1) Architecture Layers

### Layer 1: Theme and tokens

- Theme config lives in `app/layout.tsx`.
- Design tokens live in `app/globals.css` under `:root` (`--surface`, `--line`, `--shadow-*`, etc.).
- Add reusable visual values as tokens first, then consume them in classes/components.

### Layer 2: Shared UI contracts

- Shared shells: `src/shared/ui/shells/`
- Shared components: `src/shared/ui/components/`
- Shared layer defines stable interaction and layout contracts used across features.

### Layer 3: Feature UI

- Feature-local UI: `src/features/<slice>/components/`
- Feature components compose shared components/contracts and product-specific logic.
- Feature code must not introduce cross-app styling side effects.

### Layer 4: Route composition

- Route wiring and server-first composition live in `app/`.
- Keep data and routing logic near route boundaries.

## 2) Import Boundaries (Pragmatic for current codebase)

Current repo still contains direct Radix imports in feature files. Migration is incremental.

Rules for all **new or touched** code:

- Prefer imports from shared UI layer when a project wrapper/pattern already exists.
- Do not introduce a new direct `@radix-ui/*` import in feature code if an equivalent shared component exists.
- Direct Radix imports are expected in `app/**` and `src/shared/ui/**`.
- If a feature needs a Radix primitive not yet wrapped, use it minimally and extract a shared wrapper when repetition starts (2+ usages).

## 3) Styling and Token Policy

- No hardcoded one-off visual constants in feature components (`#hex`, random `px`, ad-hoc shadow/z-index).
- Use existing tokens/classes first; add new tokens only when needed.
- Keep layout contracts in `app/globals.css` (shell, overflow, responsive structure).
- Inline style is allowed only for truly dynamic geometry/runtime values (for example canvas coordinates).

## 4) Radix Contract Usage

- Prefer Radix behavior primitives over custom interaction logic (`Dialog`, `DropdownMenu`, `Tooltip`, `Tabs`, `Select`, etc.).
- Style state via `className` + `data-*` attributes (`data-state`, `data-side`, `data-disabled`) and supported CSS vars.
- Do not style by deep targeting internal DOM that wrappers do not own.

## 5) `asChild` Composition Rule

Only use `asChild` when the child component:

1. spreads all received props,
2. forwards `ref`,
3. remains focusable/accessible.

If these conditions are not true, do not use `asChild`.

## 6) Overlay and Portal Rule

- Overlay components (`Dialog`, `Popover`, `DropdownMenu`, `Tooltip`) must follow one shared layering approach.
- Avoid arbitrary `z-index` escalation patterns (`9999` wars).
- Keep overlay content within Theme context. If custom portal root is used, ensure Theme styles/tokens still apply.

## 7) Accessibility and i18n

- Icon-only controls must always have `aria-label`.
- New interactions must be keyboard reachable and dismissible.
- Never hardcode user-facing strings in UI components; use `src/shared/i18n/messages/`.
- Verify `en`, `uk`, `ru` string lengths do not break layout.

## 8) Version and API Stability

- Keep `@radix-ui/themes` and `@radix-ui/react-icons` on explicit, reviewed versions.
- Update Radix packages intentionally, not ad hoc.
- Do not introduce `unstable_*` Radix APIs into shared UI contracts.

## 9) Default UI Change Workflow

1. Validate interaction and layout behavior for the target surface first.
2. Compose with Radix + shared contracts.
3. Add/extend semantic class names.
4. Add/update i18n keys.
5. Verify desktop and mobile behavior.
6. Run quality gates.

## 10) Definition of Done (UI)

A UI task is complete only if:

- `npm run lint` passes
- `npm run typecheck` passes
- scrolling behavior is intentional and does not degrade focus/keyboard paths
- keyboard path works for new interactive controls
- i18n keys exist for all supported locales
- repeated patterns are promoted to shared layer when needed

## 11) PR Review Checklist

- Is this consistent with Radix Themes and existing shell contracts?
- Are tokens/classes reused instead of ad hoc styling?
- Is state styling based on contract (`data-*`) rather than fragile DOM targeting?
- Are overlays/portals and focus behavior consistent?
- Are localization and terminology aligned with Sorelo domain language?

## 12) Anti-Patterns (Reject in Review)

- Scroll behavior that causes context loss or interaction conflicts.
- Hardcoded labels outside i18n message files.
- Unscoped global overrides that leak across pages.
- Deep CSS selectors against internals of third-party components.
- Unreviewed adoption of unstable Radix APIs.

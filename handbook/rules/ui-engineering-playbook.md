# UI Engineering Playbook (Sorelo: Radix Themes + Vanilla CSS)

This playbook is the persistent engineering standard for building and scaling Sorelo UI.

Use it as the default reference for implementation, code review, and onboarding.

## 0) Repository Decisions (Locked)

- Component model: **Radix Themes first** (`@radix-ui/themes`), with Radix behavior contracts.
- Styling stack: **vanilla global CSS** in `app/globals.css` + scoped class names.
- Theme root: centralized in `app/layout.tsx` (`<Theme ...>`).
- Scrolling should be intentional per surface, preserving context and interaction clarity.
- AI-assisted UI workflow: **Figma for direction and review**, **Codex for implementation**, **Playwright/computer-use for rendered verification**.

These choices are intentional for predictability and scale. Do not mix in Tailwind/CSS-in-JS/CSS Modules for shared UI architecture without an explicit architecture decision.

## 0.1) Current Visual Direction (Locked for current cycle)

Sorelo's current UI direction is:

- **signal-first expressive minimalism**

Interpret that as:

- calm, high-signal layouts instead of decorative density or dashboard sprawl
- expressive typography that creates hierarchy quickly and makes important meaning glanceable
- purposeful shape and container contrast that clarify role, grouping, and action
- living motion that confirms state, focus, and causality without becoming ambient decoration
- spatial cues such as grids, nodes, traces, and causal paths that reinforce the product model
- a light-first interface with restrained signal accents and neutral structural surfaces

This direction explicitly rejects:

- glassmorphism
- frosted or translucent chrome as a default surface style
- blur-heavy panels used as a shortcut for depth or polish
- generic dashboard card grids on non-dashboard surfaces

Current implementation anchors that should remain coherent unless a deliberate redesign is approved:

- `app/layout.tsx` sets the active font pair and Radix theme baseline
- `app/globals.css` defines the active surface language, spacing contracts, panel depth, and map-derived ornaments
- landing and app-shell surfaces already use mono metadata cues, restrained accents, and structural map metaphors that should be refined rather than replaced wholesale

### 0.1.1) Product-Wide Visual Pillars

Across all surfaces:

- prioritize glanceable hierarchy before decorative flourish
- use typography to do the first job of emphasis
- use shape to distinguish states, groups, and interaction zones
- use motion to explain response, selection, and transition
- keep the UI coherent through shared tokens, spacing, type, and state behavior

### 0.1.2) Canvas-First Signal UI (Scoped)

`canvas-first signal UI` is a scoped mode, not the entire product style.

Use it only in the map workspace and future canvas-driven working zones.

In those zones:

- the canvas must dominate the composition
- signal accents should help the user read structure, selection, and causality at a glance
- surrounding chrome should recede and support the work surface
- typography, shape, and motion should intensify structure-reading rather than add ornament

Outside those zones:

- keep the interface quieter and more operational
- preserve the same product-wide visual language
- do not force canvas metaphors onto utility surfaces where they reduce clarity

When evolving the look:

- change tokens, shell contracts, and reusable classes before feature-local overrides
- preserve first-viewport clarity and strong selection/next-step cues
- do not introduce a second visual language on top of the current one

## 0.2) AI-Assisted Design Workflow (Default)

For meaningful UI work, do not jump from a loose prompt straight into production code.

Use this sequence by default:

1. define the screen goal, target user moment, success state, constraints, locales, and existing surface context
2. explore or review the visual direction in Figma when composition, hierarchy, or interaction framing changes materially
3. implement the approved direction in code with Radix-first contracts, shared shells, tokens, and `app/globals.css`
4. verify the rendered result in-browser with Playwright and/or computer-use across desktop and mobile
5. run an explicit critique pass against hierarchy, selection clarity, next-step clarity, terminology, accessibility, and state coverage

Additional rules:

- Figma is the visual planning and review surface, not a second source of truth for domain behavior
- code remains the implemented source of truth until an approved design change is landed
- for tiny copy-only or single-control tweaks, you may skip the Figma step if composition and interaction framing do not change
- use realistic content, state labels, and edge cases where possible; do not evaluate a surface only with ideal placeholder content

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
- Prefer solid, crisp, low-noise surfaces over translucent or frosted ones.
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

1. Define the target user moment, content constraints, locales, and success state.
2. If the change affects composition or visual direction, establish or review the direction in Figma first.
3. Validate interaction and layout behavior for the target surface.
4. Compose with Radix + shared contracts.
5. Add or extend tokens and semantic class names before feature-specific exceptions.
6. Add or update i18n keys.
7. Verify desktop, mobile, and keyboard behavior in-browser with Playwright and/or computer-use.
8. Run quality gates.

## 10) Definition of Done (UI)

A UI task is complete only if:

- `npm run lint` passes
- `npm run typecheck` passes
- scrolling behavior is intentional and does not degrade focus/keyboard paths
- keyboard path works for new interactive controls
- i18n keys exist for all supported locales
- material UI changes have been checked in a rendered browser pass, not only by static code inspection
- repeated patterns are promoted to shared layer when needed

## 11) PR Review Checklist

- Is this consistent with Radix Themes and existing shell contracts?
- Does this preserve the current visual direction of signal-first expressive minimalism?
- Is typography, shape, motion, and hierarchy doing the main visual work instead of blur or decorative chrome?
- If this is a map or canvas-first work zone, does it correctly apply canvas-first signal UI without overwhelming secondary surfaces?
- Are tokens/classes reused instead of ad hoc styling?
- Is state styling based on contract (`data-*`) rather than fragile DOM targeting?
- Are overlays/portals and focus behavior consistent?
- Was the rendered result verified in-browser for desktop/mobile and critical states?
- Are localization and terminology aligned with Sorelo domain language?

## 12) Anti-Patterns (Reject in Review)

- One-shot prompt-to-code UI changes that skip rendered verification.
- Generic dashboard composition on non-dashboard surfaces.
- Glassmorphism, frosted panels, or blur-heavy chrome as the primary product style.
- Applying canvas-first signal UI to utility or support surfaces where it hurts clarity.
- Scroll behavior that causes context loss or interaction conflicts.
- Hardcoded labels outside i18n message files.
- Unscoped global overrides that leak across pages.
- Deep CSS selectors against internals of third-party components.
- Unreviewed adoption of unstable Radix APIs.

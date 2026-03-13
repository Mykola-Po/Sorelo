# AGENTS.md

## Mission
Build Sorelo as an explainable, durable product.

Sorelo helps a user build an explainable map of a person: states, beliefs, triggers, and the links between them, so the user can understand causes and behavioral reactions.

Core product terms are fixed:
- **Concepts**: canonical units of meaning.
- **Links**: explicit directional or relational connections between Concepts.
- **Inspector**: detailed view/editor for selected entities and their evidence.
- **Scenarios**: derived simulations of likely reaction chains.

Preserve explainability, data integrity, and future extensibility over local convenience.

## Working agreements
- Make the smallest correct change that fully solves the task.
- Reuse existing patterns before introducing new ones.
- Do not rewrite unrelated files or perform cosmetic refactors unless asked.
- Keep route files thin. Put domain logic in domain modules, not in page components.
- Prefer explicitness over magic. Prefer typed boundaries over implicit behavior.
- When requirements conflict, prioritize in this order:
  1. Correctness and safety
  2. Explainability of behavior and data
  3. UX clarity
  4. Performance
  5. Developer convenience

## Review guidance
- Use `code_review.md` when reviewing changes.
- Apply it together with this file; if they conflict, follow `AGENTS.md` for project constraints and `code_review.md` for review severity and reporting.  

## Platform baseline
- Target **Next.js 16 App Router**, **React 19**, **TypeScript**, **Node 20.9+**.
- Default to **Server Components**. Add `'use client'` only for interactivity, browser APIs, local UI state, or React client hooks.
- Fetch data on the server when possible.
- Keep the client bundle small. Do not move server-only logic into client code.
- Be explicit with caching and revalidation. Do not introduce caching unless the freshness model is clear.
- Prefer streaming and incremental rendering for slow data rather than large client-side loaders.

## Architecture rules
- Keep the architecture domain-first, not page-first.
- Separate:
  - domain logic
  - persistence/query logic
  - UI/presentation logic
  - transport/boundary validation
- Avoid cross-feature imports when a dependency can point inward to a shared primitive.
- Prefer feature slices for product domains (`concepts`, `links`, `inspector`, `scenarios`) and shared modules only for true cross-cutting concerns.
- Keep transformations and derived calculations pure and testable.
- Store canonical source data separately from derived or simulated outputs.

## Domain modeling rules
- A **Concept** is a canonical node, not a rendered UI artifact.
- A **Link** must have explicit endpoints and an explicit relation type or semantic role.
- **Inspector** surfaces and edits details; it does not become a second source of truth.
- **Scenarios** are derived hypotheses or simulations; they must not silently overwrite observations or canonical facts.
- Prefer structured fields over free-form blobs whenever the data is likely to be filtered, compared, scored, or reused.
- Preserve provenance where possible: observation, source note, confidence, timestamp, actor.
- Avoid opaque scoring models without documented inputs.
- Stable identifiers are required for all core entities.

## UI system rules
- Use **@radix-ui/themes** primitives first.
- Use **@radix-ui/react-icons** for common UI icons unless an existing local icon already fits.
- Keep visual decisions centralized in:
  - Radix Theme configuration
  - CSS custom properties
  - `app/globals.css`
- Do not introduce Tailwind, CSS-in-JS, or ad hoc styling systems.
- Do not introduce a second component library without approval.
- Prefer semantic HTML and accessible Radix primitives.
- Preserve keyboard navigation, visible focus, and readable contrast.
- Respect reduced motion preferences.
- Keep interactive islands small and isolated.
- Heavy client-only graph or canvas behavior must be isolated from route/layout shells.
- Prefer composition over monolithic UI components.

## CSS rules
- The current styling constraint is **vanilla CSS via `app/globals.css`**.
- Treat `app/globals.css` as a layered system, not a dumping ground.
- Organize styles in this order:
  1. design tokens / CSS variables
  2. reset / base
  3. layout primitives
  4. reusable component classes
  5. feature-specific selectors
  6. state and utility selectors
- Use stable prefixes for project classes and data attributes (for example `sl-`), especially for feature UI.
- Avoid deep selector chains and selector brittleness.
- Avoid one-off magic numbers when a token or existing spacing step can be used.
- Prefer Radix tokens and CSS variables over hardcoded values.
- Inline styles are allowed only for truly dynamic values that are impractical in CSS, preferably through CSS variables.

## Next.js rules
- Use the **App Router** conventions.
- Prefer server rendering by default.
- Use Route Handlers or Server Actions for server mutations, depending on the feature boundary.
- Keep server-only utilities server-only.
- Do not import Node-only modules into client components.
- Use `next/image` and `next/font` when relevant.
- Keep metadata, loading, error, and empty states explicit.
- Do not add client data fetching when server data fetching is sufficient.

## React rules
- Keep components small, typed, and single-purpose.
- Prefer derived state over duplicated local state.
- Avoid effect-heavy logic when it can be expressed as render logic, event handling, or server-side work.
- Use React 19 capabilities where they simplify UX, but do not chase novelty for its own sake.
- Do not hide business logic inside UI components.

## Data, database, and auth rules
- Use **Supabase** for auth/session/storage/platform capabilities.
- Use **Drizzle** as the primary typed database access layer for application data and SQL migrations.
- Do not mix Drizzle queries and `supabase-js` table queries for the same application table flow unless there is a documented reason.
- Never expose privileged Supabase keys to the browser.
- Use SSR-safe Supabase clients with cookies for authenticated server rendering.
- Validate all external input at the boundary with **zod**.
- Define and access environment variables through a single **@t3-oss/env-nextjs** module.
- Keep database schema, migrations, and generated types in sync.

## Database evolution rules
- Prefer additive schema evolution.
- Do not edit historical migrations after they are committed/shared; add a new migration instead.
- Include constraints and indexes intentionally, not as an afterthought.
- Model for future change:
  - stable ids
  - created/updated timestamps
  - optional ordering fields where UI order matters
  - nullable fields only when semantically justified
- Separate canonical entities from derived read models or cached projections.
- Document destructive changes and data migrations clearly.

## Validation and type rules
- Use TypeScript strictly.
- Avoid `any`. If unavoidable, isolate it and explain why.
- Parse untrusted input with zod.
- Keep API payload types, DB types, and domain types intentionally mapped; do not blur layers casually.
- Prefer narrow types and explicit return types for public helpers.

## Testing and quality rules
- Every non-trivial change must preserve or improve test coverage.
- Add or update tests for bug fixes and business rules.
- Prefer **Vitest** for pure logic, mapping, validation, and domain behavior.
- Prefer **Playwright** for critical user flows, auth flows, and regressions spanning multiple layers.
- Use resilient Playwright selectors based on roles, labels, and user-visible behavior.
- Do not rely on brittle CSS selectors in end-to-end tests unless there is no better option.
- Before finishing, run the relevant checks supported by the repository. Prefer the package-manager-native script if present.
- Minimum expected verification when relevant:
  - lint
  - typecheck
  - unit/integration tests
  - build
  - Playwright tests for affected flows
- Do not suppress ESLint, TypeScript, or test failures without a brief justification in code comments or the task summary.

## Performance rules
- Avoid unnecessary client JavaScript.
- Avoid over-fetching and duplicate queries.
- Keep serialized props small.
- Lazy-load heavy client-only code.
- Be intentional about revalidation and caching boundaries.
- Measure before introducing complexity for performance reasons.

## UX rules specific to Sorelo
- The UI must help the user build understanding, not just store data.
- Prefer clarity over visual density.
- Every major screen should make these obvious:
  - what is selected
  - what it means
  - how it connects
  - what can be changed next
- Concepts and Links should remain understandable without hidden side effects.
- Inspector should reveal detail without breaking graph context.
- Scenarios should clearly distinguish observed facts from simulated chains.
- Product copy must use the canonical terms: **Concepts**, **Links**, **Inspector**, **Scenarios**.
- Do not introduce alternate naming for the same core objects.

## Change control
- If a task implies a new dependency, new architectural pattern, or schema change, keep the change scoped and explain the tradeoff.
- If the task can be solved by extending an existing primitive, do that instead of introducing a new abstraction.
- Leave concise comments only where the reasoning is not obvious from the code.
- Update docs when behavior, constraints, or developer workflow materially changes.

## Done criteria
A task is done only when all of the following are true:
- The requested behavior works.
- The change is scoped and does not create unrelated churn.
- Types, validation, and boundaries remain coherent.
- Accessibility and keyboard behavior are not degraded.
- Relevant tests/checks pass, or failures are explicitly explained.
- The implementation matches Sorelo’s canonical product language and domain model.

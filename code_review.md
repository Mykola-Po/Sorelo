# code_review.md

## Purpose
Review changes for correctness, safety, explainability, durability, and architectural fit.

This repository powers **Sorelo**, an explainable product. A change is not acceptable if it makes the system harder to reason about, even if the local code looks convenient.

Core product terms are fixed and must be preserved:
- **Concepts**: canonical units of meaning.
- **Links**: explicit directional or relational connections between Concepts.
- **Inspector**: detailed view/editor for selected entities and their evidence.
- **Scenarios**: derived simulations of likely reaction chains.

## Review priorities
Review in this order:
1. Correctness and data safety
2. Explainability of behavior and outputs
3. Architectural integrity and future change cost
4. UX clarity and accessibility
5. Performance
6. Code style and minor cleanup

Do not let low-value nitpicks hide high-value issues.

## Severity model
Use these severities when reporting issues:

- **P0** — release-blocking or production-compromising issue.
  - Data loss or destructive migration risk
  - Auth or privilege escalation issue
  - Silent corruption of Concepts, Links, Inspector data, or Scenario outputs
  - Major broken path in critical user flow
- **P1** — serious issue that should be fixed before merge.
  - Wrong domain behavior
  - Misleading UI that causes wrong user conclusions
  - Broken validation or unsafe boundary
  - Clear accessibility regression in primary flows
  - Significant performance regression in a core screen
- **P2** — meaningful but non-blocking issue.
  - Brittle implementation
  - Missing test around a risky edge case
  - Small architectural leak likely to spread
  - Reviewable UX confusion without data risk
- **P3** — minor issue or improvement.
  - Naming drift
  - Small cleanup
  - Consistency issue with low impact

Prefer fewer, high-confidence findings over long speculative lists.

## What to optimize for
Approve changes that:
- preserve canonical domain semantics
- reduce ambiguity in data flow and UI behavior
- keep boundaries explicit
- keep future schema and product evolution cheap
- improve understanding for the end user

Reject or flag changes that:
- hide domain logic inside UI components
- add silent side effects
- duplicate sources of truth
- make Scenario outputs look like observed facts
- mix infrastructure concerns into domain code
- create a local shortcut that increases future rewrite cost

## Core review questions
For every non-trivial change, answer these questions:

1. Is the behavior correct for the stated task?
2. Does the change preserve Sorelo's explainable model?
3. Does it keep a single source of truth for canonical data?
4. Are boundaries between UI, domain, persistence, and validation still clear?
5. Will this choice still hold when the feature grows 10x in data volume, states, or user workflows?
6. Did the change introduce hidden coupling, hidden state, or hidden mutation?
7. Is there a simpler change that fits existing primitives better?

## Domain-specific review rules

### Concepts
- A Concept must remain a canonical node, not a UI-only convenience structure.
- Reject changes that collapse multiple semantic meanings into one field without a clear model.
- Flag free-form blobs where structure is likely needed for filtering, comparison, confidence, provenance, or scoring.
- Stable identifiers are required.

### Links
- Links must have explicit endpoints.
- Relation type or semantic role must be explicit.
- Flag ambiguous link creation or mutation paths.
- Reject hidden bidirectional behavior unless explicitly modeled.

### Inspector
- Inspector is a detail surface, not a second source of truth.
- Flag duplicated write paths that can drift from canonical entities.
- Ensure edits made in Inspector resolve back to canonical entities predictably.

### Scenarios
- Scenarios are derived hypotheses or simulations.
- Reject any change that silently upgrades simulated output into canonical fact.
- Observations, evidence, confidence, and simulation outputs must remain distinguishable.
- Flag opaque scoring or ranking logic when inputs are not documented or inferable.

### Provenance and explainability
- Prefer preserving source note, timestamp, confidence, and actor when a change touches evidence or interpretation.
- Flag transformations that make it harder to explain why the system shows a conclusion.

## Architecture review rules
- Domain-first over page-first.
- Route files should stay thin.
- Domain behavior belongs in domain modules, not in React components or route handlers.
- Persistence logic belongs in explicit query/command modules.
- Validation belongs at transport and input boundaries.
- Shared modules must be truly cross-cutting, not a dumping ground.
- Flag abstractions that are introduced too early and wrappers that add indirection without leverage.
- Flag page-specific code that starts becoming the de facto domain layer.

## Next.js / React review rules
- Default to Server Components.
- `'use client'` must be justified by interactivity, browser APIs, local UI state, or client hooks.
- Flag server-only logic leaking into client code.
- Flag client-side fetching when server fetching is sufficient.
- Keep loading, error, empty, and success states explicit.
- Prefer render logic and event logic over effect-heavy orchestration.
- Reject components that mix rendering, domain decisions, and persistence in one file.
- Flag unnecessary bundle growth and oversized client islands.

## UI / UX review rules
- Use **@radix-ui/themes** primitives first.
- Keep visual decisions centralized in theme config, CSS variables, and `app/globals.css`.
- Do not accept ad hoc styling systems or styling drift.
- The current visual direction is **signal-first expressive minimalism**:
  - expressive typography
  - purposeful shape
  - living motion
  - glanceable hierarchy
- Flag glassmorphism, frosted panels, or blur-heavy chrome when they become the primary style language.
- `canvas-first signal UI` should be used only in the map workspace and future canvas-first work zones, not spread indiscriminately across utility surfaces.
- Keyboard navigation, visible focus, contrast, readable structure, and reduced motion support must not regress.
- Review whether the screen clearly answers:
  - what is selected
  - what it means
  - how it connects
  - what the user can do next
- Flag UI that looks polished but obscures model meaning.
- Flag naming drift away from **Concepts**, **Links**, **Inspector**, **Scenarios**.
- Prefer clarity over density.

## CSS review rules
- `app/globals.css` is the styling system of record for this stage of the project.
- Review for layering discipline:
  1. tokens / variables
  2. base / reset
  3. layout primitives
  4. reusable components
  5. feature selectors
  6. utilities / states
- Flag magic numbers where a token or existing spacing step should be used.
- Flag brittle selector chains and styling coupled too tightly to DOM depth.
- Inline style usage should be rare and preferably variable-driven.

## Data, database, auth, and env review rules
- **Supabase** is for auth/session/storage/platform capabilities.
- **Drizzle** is the primary typed database access layer for application data and migrations.
- Flag flows that query the same application tables through both Drizzle and `supabase-js` without a documented reason.
- Never accept privileged keys or unsafe secrets in client code.
- All external input should be validated with **zod** at the boundary.
- Environment access should stay centralized through **@t3-oss/env-nextjs**.
- Flag schema changes that are destructive, under-constrained, or lack index/constraint intent.
- Prefer additive schema evolution.
- Historical migrations should not be rewritten once committed/shared.

## Type safety review rules
- TypeScript should remain strict.
- Flag `any`, broad casts, and inferred weak types around important boundaries.
- Public helpers should have explicit return types when the boundary matters.
- Domain, DB, and transport types must not be casually blurred together.

## Testing review rules
- Every bug fix should normally add or update a regression test.
- Pure logic, mapping, validation, and domain rules belong in **Vitest**.
- Cross-layer user flows belong in **Playwright**.
- Prefer user-visible selectors in Playwright: roles, labels, names, and text where appropriate.
- Flag brittle selector usage if a more stable user-level selector is available.
- If a risky change ships without tests, require an explicit reason.
- Review whether tests actually protect the changed behavior rather than merely increasing line coverage.

## Performance review rules
- Flag unnecessary client JavaScript.
- Flag duplicate fetching and over-serialization.
- Flag large client-only graph or canvas logic coupled to route/layout shells.
- Performance optimizations are good only if they do not reduce explainability or correctness.
- Prefer simple, measurable improvements over speculative complexity.

## What not to flag by default
Do not block on these by default unless they materially affect correctness, clarity, or maintainability:
- harmless formatting differences already handled by tooling
- minor wording tweaks outside core product terminology
- small local duplication when abstraction would be worse
- missing micro-optimizations without evidence of user impact

## Review output format
When reporting findings:
- Start with the highest-severity issues.
- Be concrete and file-aware.
- Explain the user, data, or architecture impact.
- Prefer actionable fixes over abstract criticism.
- Keep findings scoped to what the diff actually changes.
- Distinguish clearly between:
  - confirmed issue
  - likely issue
  - suggestion

Recommended format per finding:
- **Severity**: P0 / P1 / P2 / P3
- **Area**: domain / UI / data / auth / validation / tests / performance / accessibility
- **Issue**: one-sentence problem statement
- **Why it matters**: consequence for user, product model, or future architecture
- **Suggested direction**: smallest credible fix

## Approval standard
A change is review-ready only if:
- behavior is correct
- domain semantics remain explicit
- no second source of truth is introduced
- boundaries remain coherent
- accessibility is not degraded
- tests and checks are updated appropriately
- the solution does not create obvious future rewrite pressure

If a change is locally convenient but increases ambiguity, coupling, or rewrite cost, treat that as a real review issue.

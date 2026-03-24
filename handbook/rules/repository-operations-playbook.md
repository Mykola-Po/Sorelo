# Repository Operations Playbook

This document defines how the Sorelo repository is protected, delivered, and maintained.

## 1. Where The Project Lives

The project has two layers:

- Local working copies on developer machines (including `git worktree` directories).
- Git history as the source of truth (local commits and remote backup once pushed).

Rules:

- Never rely on one local folder as the only copy.
- Treat uncommitted changes as volatile.
- Push important work to a remote repository early.
- Treat `git worktree` directories as disposable working copies, not as the long-term source of truth.

Before starting substantial engineering work, read `handbook/executable/project-working-guide.md`.

Use that guide for:

- repository map
- feature ownership boundaries
- safe change workflows
- risk areas
- verification expectations

Use this playbook as the safety and repository-operations companion to that engineering entrypoint.

## 2. Safety Baseline

Required controls:

1. Remote repository configured (`origin`) and used daily.
2. Branch protection enabled on default branch (PR required, force-push disabled).
3. Required checks before merge:
   - `CI / verify`
4. Secrets never committed:
   - `.env*` stays ignored
   - secrets stored in environment or secret manager
5. 2FA enabled on the Git hosting account.
6. Generated and operational artifacts stay out of Git history:
   - `backups/`
   - `tmp/`
   - `output/`
   - `.codex-*.out`
   - `.codex-*.err`
   - `tsconfig.tsbuildinfo`
   - `next-env.d.ts` remains a generated Next.js file in its canonical generated form

## 3. Local + Offsite Backup

### Local bundle backup

Create a portable full-repo backup:

```bash
npm run backup:bundle
```

Default output:

- `backups/sorela-<timestamp>.bundle`

Optional custom location:

```bash
REPO_BACKUP_DIR=E:/repo-backups npm run backup:bundle
```

### Restore from bundle

```bash
git clone path/to/sorela-<timestamp>.bundle sorela-restored
cd sorela-restored
git remote add origin <your-remote-url>
git fetch origin
```

Policy:

- Keep at least 7 daily bundles.
- Keep one weekly bundle for 8 weeks.
- Keep one monthly bundle for 6 months.
- Store backups outside the main workstation (cloud drive or external disk).

## 4. Delivery Guardrails

Use pull requests with a mandatory checklist:

- lint passes
- typecheck passes
- `db:check` passes
- tests pass or explicitly documented as skipped
- build passes
- no secrets in diff
- UI rules respected (see UI engineering playbook)
- changes are made on a short-lived branch and merged through a reviewed PR

Inbox runtime delivery flow:

1. Configure deployment env, including `INTERNAL_API_SECRET`.
2. Apply the latest SQL migration under `supabase/migrations/`.
3. Run `npm run db:check`.
4. Deploy the app.
5. Run `npm run ops:inbox:check -- --base-url <deployment-url>`.

## 5. Scaling Without Chaos

When product scope grows:

1. Keep domain boundaries explicit under `src/features/`.
2. Move repeated UI patterns into shared UI modules.
3. Add one ADR note for non-trivial architecture decisions.
   - Start with `docs/engineering/adr-template.md`
4. Keep CI strict and fast; prevent merges on red checks.
5. Maintain ownership by code area with CODEOWNERS.
6. Plan refactor windows each sprint for tech debt.

## 6. Weekly Maintenance Loop

Run every week:

1. Merge dependency updates.
2. Review CI failures and flaky tests.
3. Remove dead branches and stale worktrees.
4. Verify latest backup bundle can be cloned.

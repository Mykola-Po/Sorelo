import { readdirSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlClientMock } = vi.hoisted(() => ({
  sqlClientMock: vi.fn(),
}));

vi.mock("@/shared/auth/internal", () => ({
  resolveInternalAuthSecret: () => "test-internal-secret",
}));

vi.mock("@/shared/db/client", () => ({
  db: {},
  sqlClient: sqlClientMock,
}));

import {
  buildExecutionsCheck,
  buildMigrationDriftCheck,
  deriveInboxRuntimeStatus,
  listAppMigrationFilenames,
} from "@/features/inbox/operations";

describe("inbox operations", () => {
  beforeEach(() => {
    sqlClientMock.mockReset();
  });

  it("filters and sorts repository app migrations", () => {
    expect(
      listAppMigrationFilenames([
        "notes.md",
        "0012_inbox_runtime_hardening.sql",
        "0009_inbox_promote_apply_scope.sql",
        "draft.sql",
      ])
    ).toEqual([
      "0009_inbox_promote_apply_scope.sql",
      "0012_inbox_runtime_hardening.sql",
    ]);
  });

  it("detects migration drift when the latest applied migration lags behind the repository", () => {
    const check = buildMigrationDriftCheck({
      ledgerPresent: true,
      repoMigrations: [
        "0011_canonical_mutation_provenance.sql",
        "0012_inbox_runtime_hardening.sql",
      ],
      appliedMigrations: ["0011_canonical_mutation_provenance.sql"],
    });

    expect(check).toMatchObject({
      name: "migrations",
      status: "failed",
      details: {
        latestRepoMigration: "0012_inbox_runtime_hardening.sql",
        latestAppliedMigration: "0011_canonical_mutation_provenance.sql",
      },
    });
  });

  it("derives the highest runtime severity from the checks", () => {
    expect(
      deriveInboxRuntimeStatus([
        { status: "ok" },
        { status: "ok" },
      ])
    ).toBe("ok");
    expect(
      deriveInboxRuntimeStatus([
        { status: "ok" },
        { status: "degraded" },
      ])
    ).toBe("degraded");
    expect(
      deriveInboxRuntimeStatus([
        { status: "degraded" },
        { status: "failed" },
      ])
    ).toBe("failed");
  });

  it("tracks the current latest repo migration for ledger bootstrap and drift checks", () => {
    const migrationDirectory = path.join(
      process.cwd(),
      "supabase",
      "migrations"
    );
    const repoMigrations = listAppMigrationFilenames(readdirSync(migrationDirectory));

    expect(repoMigrations.at(-1)).toBe("0014_inbox_routing_policy_trace.sql");
  });

  it("reports degraded execution telemetry when recent failures exist", async () => {
    sqlClientMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          failure_scope: "step",
          item_id: "item-1",
          attempt_no: 2,
          step_name: "route",
          route: "clarify",
          failure_code: "pipeline",
          failure_message: "Router did not settle on a terminal outcome.",
          recorded_at: new Date("2026-03-22T12:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          step_name: "interpret",
          p95_latency_ms: 1200,
          sample_count: 4,
        },
      ])
      .mockResolvedValueOnce([
        {
          route: "clarify",
          route_count: 3,
        },
      ]);

    const check = await buildExecutionsCheck([
      "inbox_pipeline_attempts",
      "inbox_step_runs",
    ]);

    expect(check).toMatchObject({
      name: "executions",
      status: "degraded",
      details: {
        staleRunningAttempts: [],
        recentFailures: [
          {
            scope: "step",
            itemId: "item-1",
            attemptNo: 2,
            stepName: "route",
            route: "clarify",
            failureCode: "pipeline",
            failureMessage: "Router did not settle on a terminal outcome.",
            recordedAt: "2026-03-22T12:00:00.000Z",
          },
        ],
        stepLatencyP95: [
          {
            stepName: "interpret",
            p95LatencyMs: 1200,
            sampleCount: 4,
          },
        ],
        routeCounts: [
          {
            route: "clarify",
            count: 3,
          },
        ],
      },
    });
    expect(sqlClientMock).toHaveBeenCalledTimes(4);
  });

  it("reports failed execution telemetry when a running attempt is stuck", async () => {
    sqlClientMock
      .mockResolvedValueOnce([
        {
          attempt_id: "attempt-1",
          item_id: "item-9",
          attempt_no: 5,
          trigger_kind: "clarification_rerun",
          started_at: new Date("2026-03-22T11:30:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const check = await buildExecutionsCheck([
      "inbox_pipeline_attempts",
      "inbox_step_runs",
    ]);

    expect(check).toMatchObject({
      name: "executions",
      status: "failed",
      details: {
        staleRunningAttempts: [
          {
            attemptId: "attempt-1",
            itemId: "item-9",
            attemptNo: 5,
            triggerKind: "clarification_rerun",
            startedAt: "2026-03-22T11:30:00.000Z",
          },
        ],
        recentFailures: [],
        stepLatencyP95: [],
        routeCounts: [],
      },
    });
  });
});

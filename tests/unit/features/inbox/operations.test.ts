import { readdirSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { readdirMock, sqlClientMock, dbMock } = vi.hoisted(() => ({
  readdirMock: vi.fn(),
  sqlClientMock: vi.fn(),
  dbMock: {
    select: vi.fn(),
  },
}));

vi.mock("node:fs/promises", () => ({
  readdir: readdirMock,
}));

vi.mock("@/shared/config/env", () => ({
  env: {
    INBOX_INTERNAL_RUNTIME_SECRET: "test-runtime-secret",
  },
}));

vi.mock("@/shared/db/client", () => ({
  db: dbMock,
  sqlClient: sqlClientMock,
}));

import {
  collectInboxRuntimeReport,
  buildExecutionsCheck,
  buildMigrationDriftCheck,
  deriveInboxRuntimeStatus,
  listAppMigrationFilenames,
} from "@/features/inbox/operations";

describe("inbox operations", () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readdirMock.mockResolvedValue([
      {
        name: "0015_inbox_workspace_scope.sql",
        isFile: () => true,
      },
    ]);
    sqlClientMock.mockReset();
    dbMock.select.mockReset();
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

  it("reports runtime readiness and the learning bridge without exposing sensitive ids", async () => {
    dbMock.select.mockImplementation(() => {
      const chain = {
        from() {
            return {
              orderBy: async () => [
                {
                  version: "0015_inbox_workspace_scope.sql",
                },
              ],
            };
        },
      };

      return chain;
    });

    sqlClientMock
      .mockResolvedValueOnce([
        { table_name: "app_migrations" },
        { table_name: "clarification_requests" },
        { table_name: "inbox_fragments" },
        { table_name: "inbox_items" },
        { table_name: "inbox_pipeline_attempts" },
        { table_name: "inbox_step_runs" },
        { table_name: "learning_suggestion_batches" },
        { table_name: "learning_suggestion_resolutions" },
        { table_name: "learning_suggestions" },
        { table_name: "structured_packets" },
        { table_name: "workflow_events" },
      ])
      .mockResolvedValueOnce([{ failed_count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ pending_count: 0 }])
      .mockResolvedValueOnce([{ pending_count: 0 }]);

    const report = await collectInboxRuntimeReport();

    expect(report.status).toBe("ok");
    expect(report.checks.map((check) => check.name)).toEqual([
      "env",
      "readiness",
      "migrations",
      "schema",
      "items",
      "executions",
      "learning_bridge",
    ]);
    expect(report.checks.find((check) => check.name === "readiness")).toMatchObject(
      {
        status: "ok",
        details: {
          readinessMode: "deterministic_only",
        },
      }
    );
    expect(
      JSON.stringify(report).match(/item-1|workspace-|map-/)
    ).toBeNull();
  });

  it("redacts raw exception text from runtime report failures", async () => {
    readdirMock.mockRejectedValueOnce(new Error("sensitive filesystem detail"));

    dbMock.select.mockImplementation(() => {
      const chain = {
        from() {
          return {
            orderBy: async () => [
              {
                version: "0015_inbox_workspace_scope.sql",
              },
            ],
          };
        },
      };

      return chain;
    });

    sqlClientMock
      .mockResolvedValueOnce([
        { table_name: "app_migrations" },
        { table_name: "clarification_requests" },
        { table_name: "inbox_fragments" },
        { table_name: "inbox_items" },
        { table_name: "inbox_pipeline_attempts" },
        { table_name: "inbox_step_runs" },
        { table_name: "learning_suggestion_batches" },
        { table_name: "learning_suggestion_resolutions" },
        { table_name: "learning_suggestions" },
        { table_name: "structured_packets" },
        { table_name: "workflow_events" },
      ])
      .mockResolvedValueOnce([{ failed_count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ pending_count: 0 }])
      .mockResolvedValueOnce([{ pending_count: 0 }]);

    const report = await collectInboxRuntimeReport();

    expect(report.status).toBe("failed");
    expect(JSON.stringify(report)).not.toContain("sensitive filesystem detail");
    expect(report.checks.find((check) => check.name === "migrations")).toMatchObject(
      {
        status: "failed",
        code: "inbox_runtime_repo_migrations_unavailable",
      }
    );
  });

  it("tracks the current latest repo migration for ledger bootstrap and drift checks", () => {
    const migrationDirectory = path.join(
      process.cwd(),
      "supabase",
      "migrations"
    );
    const repoMigrations = listAppMigrationFilenames(readdirSync(migrationDirectory));

    expect(repoMigrations.at(-1)).toBe("0015_inbox_workspace_scope.sql");
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
            attemptNo: 2,
            route: "clarify",
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
            attemptNo: 5,
            startedAt: "2026-03-22T11:30:00.000Z",
          },
        ],
        recentFailures: [],
        stepLatencyP95: [],
        routeCounts: [],
      },
    });
  });

  it("serializes execution telemetry timestamps when SQL returns strings", async () => {
    sqlClientMock
      .mockResolvedValueOnce([
        {
          attempt_id: "attempt-2",
          item_id: "item-4",
          attempt_no: 1,
          trigger_kind: "manual_process",
          started_at: "2026-03-22T10:15:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          failure_scope: "attempt",
          item_id: "item-4",
          attempt_no: 1,
          step_name: null,
          route: "canonical",
          failure_code: "validation",
          failure_message: "Missing normalized packet.",
          recorded_at: "2026-03-22T10:20:00.000Z",
        },
      ])
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
            attemptNo: 1,
            startedAt: "2026-03-22T10:15:00.000Z",
          },
        ],
        recentFailures: [
          {
            scope: "attempt",
            attemptNo: 1,
            route: "canonical",
            recordedAt: "2026-03-22T10:20:00.000Z",
          },
        ],
      },
    });
  });
});

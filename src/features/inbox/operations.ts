import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

import { desc } from "drizzle-orm";

import { db, sqlClient } from "@/shared/db/client";
import { env } from "@/shared/config/env";
import { appMigrations } from "@/shared/db/schema";

export type InboxRuntimeCheckStatus = "ok" | "degraded" | "failed";
export type InboxRuntimeCheckName =
  | "env"
  | "readiness"
  | "migrations"
  | "schema"
  | "items"
  | "executions"
  | "learning_bridge";

export type InboxRuntimeCheck = {
  name: InboxRuntimeCheckName;
  status: InboxRuntimeCheckStatus;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type InboxRuntimeReport = {
  status: InboxRuntimeCheckStatus;
  generatedAt: string;
  checks: InboxRuntimeCheck[];
};

type FailedInboxItemSample = {
  updatedAt: string;
  attemptNo: number | null;
};

type RuntimeReadinessMode = "deterministic_only" | "openai_enabled";

const appMigrationFilenamePattern = /^\d{4}_.+\.sql$/;
const migrationDirectory = path.join(process.cwd(), "supabase", "migrations");
const failedItemSampleLimit = 5;

export const requiredInboxRuntimeTables = [
  "app_migrations",
  "inbox_items",
  "inbox_fragments",
  "structured_packets",
  "clarification_requests",
  "workflow_events",
] as const;
export const requiredInboxExecutionTables = [
  "inbox_pipeline_attempts",
  "inbox_step_runs",
] as const;
export const requiredInboxLearningBridgeTables = [
  "learning_suggestion_batches",
  "learning_suggestions",
  "learning_suggestion_resolutions",
] as const;
const trackedInboxRuntimeTables = [
  ...requiredInboxRuntimeTables,
  ...requiredInboxExecutionTables,
  ...requiredInboxLearningBridgeTables,
] as const;

type MigrationDriftInput = {
  ledgerPresent: boolean;
  repoMigrations: readonly string[];
  appliedMigrations: readonly string[];
};

function serializeTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return value;
  }

  return parsedValue.toISOString();
}

function buildFailedCheck(
  name: InboxRuntimeCheckName,
  code: string,
  message: string,
  details?: Record<string, unknown>
): InboxRuntimeCheck {
  if (details) {
    return {
      name,
      status: "failed",
      code,
      message,
      details,
    };
  }

  return {
    name,
    status: "failed",
    code,
    message,
  };
}

function buildOkCheck(
  name: InboxRuntimeCheckName,
  code: string,
  message: string,
  details?: Record<string, unknown>
): InboxRuntimeCheck {
  if (details) {
    return {
      name,
      status: "ok",
      code,
      message,
      details,
    };
  }

  return {
    name,
    status: "ok",
    code,
    message,
  };
}

function buildDegradedCheck(
  name: InboxRuntimeCheckName,
  code: string,
  message: string,
  details?: Record<string, unknown>
): InboxRuntimeCheck {
  if (details) {
    return {
      name,
      status: "degraded",
      code,
      message,
      details,
    };
  }

  return {
    name,
    status: "degraded",
    code,
    message,
  };
}

export function listAppMigrationFilenames(fileNames: readonly string[]) {
  return [...fileNames]
    .filter((fileName) => appMigrationFilenamePattern.test(fileName))
    .sort((left, right) => left.localeCompare(right));
}

export function deriveInboxRuntimeStatus(
  checks: readonly Pick<InboxRuntimeCheck, "status">[]
): InboxRuntimeCheckStatus {
  if (checks.some((check) => check.status === "failed")) {
    return "failed";
  }

  if (checks.some((check) => check.status === "degraded")) {
    return "degraded";
  }

  return "ok";
}

export function buildMigrationDriftCheck({
  ledgerPresent,
  repoMigrations,
  appliedMigrations,
}: MigrationDriftInput): InboxRuntimeCheck {
  const latestRepoMigration = repoMigrations.at(-1) ?? null;
  const latestAppliedMigration = appliedMigrations.at(-1) ?? null;

  if (!ledgerPresent) {
    return buildFailedCheck(
      "migrations",
      "inbox_runtime_missing_migration_ledger",
      "Inbox migration ledger table is missing.",
      {
        latestRepoMigration,
        latestAppliedMigration,
      }
    );
  }

  if (!latestRepoMigration) {
    return buildFailedCheck(
      "migrations",
      "inbox_runtime_missing_repo_migrations",
      "No repository app migrations were found.",
      {
        latestRepoMigration,
        latestAppliedMigration,
      }
    );
  }

  if (!latestAppliedMigration) {
    return buildFailedCheck(
      "migrations",
      "inbox_runtime_missing_applied_migrations",
      "No applied app migrations were recorded.",
      {
        latestRepoMigration,
        latestAppliedMigration,
      }
    );
  }

  if (latestAppliedMigration !== latestRepoMigration) {
    return buildFailedCheck(
      "migrations",
      "inbox_runtime_migration_drift",
      "Inbox migration ledger is behind the repository.",
      {
        latestRepoMigration,
        latestAppliedMigration,
      }
    );
  }

  return buildOkCheck(
    "migrations",
    "inbox_runtime_migration_ledger_ok",
    "Inbox migration ledger matches the repository.",
    {
      latestRepoMigration,
      latestAppliedMigration,
    }
  );
}

async function readRepoAppMigrations() {
  const migrationEntries = await readdir(migrationDirectory, {
    withFileTypes: true,
  });

  return listAppMigrationFilenames(
    migrationEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  );
}

async function readAvailableInboxTables() {
  const tableRows = await sqlClient<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where
      table_schema in ('app_private', 'learning')
    order by table_name
  `;

  return tableRows
    .map((row) => row.table_name)
    .filter((tableName) =>
      trackedInboxRuntimeTables.includes(tableName as never)
    );
}

function buildEnvCheck(secret: string | null): InboxRuntimeCheck {
  if (!secret) {
    return buildFailedCheck(
      "env",
      "inbox_runtime_missing_runtime_secret",
      "INBOX_INTERNAL_RUNTIME_SECRET is not configured.",
      {
        requiredEnv: ["INBOX_INTERNAL_RUNTIME_SECRET"],
      }
    );
  }

  return buildOkCheck(
    "env",
    "inbox_runtime_runtime_secret_configured",
    "INBOX_INTERNAL_RUNTIME_SECRET is configured.",
    {
      requiredEnv: ["INBOX_INTERNAL_RUNTIME_SECRET"],
    }
  );
}

function buildReadinessCheck(): InboxRuntimeCheck {
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const inboxLlmEnabled = process.env.INBOX_LLM_ENABLED !== "false";
  const readinessMode: RuntimeReadinessMode =
    hasOpenAiKey && inboxLlmEnabled
      ? "openai_enabled"
      : "deterministic_only";

  return buildOkCheck(
    "readiness",
    readinessMode === "openai_enabled"
      ? "inbox_runtime_readiness_openai_enabled"
      : "inbox_runtime_readiness_deterministic_only",
    readinessMode === "openai_enabled"
      ? "Inbox is ready for OpenAI-backed interpretation."
      : "Inbox is ready in deterministic-only mode.",
    {
      readinessMode,
      inboxLlmEnabled,
      hasOpenAiKey,
    }
  );
}

function buildSchemaCheck(
  availableTables: readonly string[]
): InboxRuntimeCheck {
  const missingTables = requiredInboxRuntimeTables.filter(
    (tableName) => !availableTables.includes(tableName)
  );

  if (missingTables.length > 0) {
    return buildFailedCheck(
      "schema",
      "inbox_runtime_missing_tables",
      "Inbox runtime tables are missing.",
      {
        missingTables,
        requiredTables: [...requiredInboxRuntimeTables],
      }
    );
  }

  return buildOkCheck("schema", "inbox_runtime_tables_available", "Inbox runtime tables are available.", {
    requiredTables: [...requiredInboxRuntimeTables],
  });
}

async function readAppliedAppMigrations(ledgerPresent: boolean) {
  if (!ledgerPresent) {
    return [];
  }

  const rows = await db
    .select({
      version: appMigrations.version,
    })
    .from(appMigrations)
    .orderBy(desc(appMigrations.version));

  return rows.map((row) => row.version).reverse();
}

async function buildItemsCheck(
  availableTables: readonly string[]
): Promise<InboxRuntimeCheck> {
  const requiredItemTables = ["inbox_items", "workflow_events"];
  const missingTables = requiredItemTables.filter(
    (tableName) => !availableTables.includes(tableName)
  );

  if (missingTables.length > 0) {
    return buildFailedCheck(
      "items",
      "inbox_runtime_missing_item_tables",
      "Inbox failure status could not be inspected because required tables are missing.",
      {
        missingTables,
      }
    );
  }

  const countRows = await sqlClient<
    { failed_count: number }[]
  >`
    select count(*)::int as failed_count
    from app_private.inbox_items
    where status = 'failed_needs_review'
  `;
  const failedCount = countRows[0]?.failed_count ?? 0;

  const sampleRows = await sqlClient<
    {
      updated_at: Date | string;
      attempt_no: number | null;
    }[]
  >`
    select
      item.updated_at,
      failure.attempt_no
    from app_private.inbox_items as item
    left join lateral (
      select
        event.attempt_no,
        event.payload ->> 'message' as message
      from app_private.workflow_events as event
      where
        event.item_id = item.id
        and event.status = 'failed'
      order by event.created_at desc
      limit 1
    ) as failure on true
    where item.status = 'failed_needs_review'
    order by item.updated_at desc
    limit ${failedItemSampleLimit}
  `;

  const sample = sampleRows.map(
    (row): FailedInboxItemSample => ({
      updatedAt: serializeTimestamp(row.updated_at),
      attemptNo: row.attempt_no,
    })
  );

  if (failedCount > 0) {
    return buildDegradedCheck(
      "items",
      "inbox_runtime_items_waiting_for_review",
      "Inbox has items waiting for manual review.",
      {
        failedNeedsReviewCount: failedCount,
        sample,
      }
    );
  }

  return buildOkCheck(
    "items",
    "inbox_runtime_items_clear",
    "Inbox has no failed items waiting for review.",
    {
      failedNeedsReviewCount: 0,
      sample,
    }
  );
}

export async function buildExecutionsCheck(
  availableTables: readonly string[]
): Promise<InboxRuntimeCheck> {
  const missingTables = requiredInboxExecutionTables.filter(
    (tableName) => !availableTables.includes(tableName)
  );

  if (missingTables.length > 0) {
    return buildFailedCheck(
      "executions",
      "inbox_runtime_missing_execution_tables",
      "Inbox execution telemetry tables are missing.",
      {
        missingTables,
        requiredTables: [...requiredInboxExecutionTables],
      }
    );
  }

  const [staleRunningRows, recentFailureRows, latencyRows, routeCountRows] =
    await Promise.all([
      sqlClient<
        {
          attempt_id: string;
          item_id: string;
          attempt_no: number;
          trigger_kind: string;
          started_at: Date | string;
        }[]
      >`
        select
          attempt.id as attempt_id,
          attempt.item_id,
          attempt.attempt_no,
          attempt.trigger_kind::text as trigger_kind,
          attempt.started_at
        from app_private.inbox_pipeline_attempts as attempt
        where
          attempt.status = 'running'
          and attempt.started_at < now() - interval '5 minutes'
        order by attempt.started_at asc
        limit ${failedItemSampleLimit}
      `,
      sqlClient<
        {
          failure_scope: string;
          item_id: string;
          attempt_no: number;
          step_name: string | null;
          route: string | null;
          failure_code: string | null;
          failure_message: string | null;
          recorded_at: Date | string;
        }[]
      >`
        select *
        from (
          select
            'attempt'::text as failure_scope,
            attempt.item_id,
            attempt.attempt_no,
            null::text as step_name,
            attempt.route::text as route,
            attempt.failure_code::text as failure_code,
            attempt.failure_message,
            coalesce(attempt.finished_at, attempt.started_at) as recorded_at
          from app_private.inbox_pipeline_attempts as attempt
          where
            attempt.status = 'failed'
            and coalesce(attempt.finished_at, attempt.started_at) >= now() - interval '24 hours'

          union all

          select
            'step'::text as failure_scope,
            attempt.item_id,
            attempt.attempt_no,
            step.step_name,
            step.route::text as route,
            step.failure_code::text as failure_code,
            step.failure_message,
            coalesce(step.finished_at, step.started_at) as recorded_at
          from app_private.inbox_step_runs as step
          inner join app_private.inbox_pipeline_attempts as attempt
            on attempt.id = step.attempt_id
          where
            step.status = 'failed'
            and coalesce(step.finished_at, step.started_at) >= now() - interval '24 hours'
        ) as failures
        order by failures.recorded_at desc
        limit ${failedItemSampleLimit}
      `,
      sqlClient<
        {
          step_name: string;
          p95_latency_ms: number;
          sample_count: number;
        }[]
      >`
        select
          step.step_name,
          percentile_disc(0.95) within group (order by step.latency_ms)::int as p95_latency_ms,
          count(*)::int as sample_count
        from app_private.inbox_step_runs as step
        where
          step.status = 'completed'
          and step.latency_ms is not null
          and step.started_at >= now() - interval '24 hours'
        group by step.step_name
        order by step.step_name asc
      `,
      sqlClient<
        {
          route: string;
          route_count: number;
        }[]
      >`
        select
          attempt.route::text as route,
          count(*)::int as route_count
        from app_private.inbox_pipeline_attempts as attempt
        where
          attempt.status = 'completed'
          and attempt.route is not null
          and attempt.started_at >= now() - interval '24 hours'
        group by attempt.route
        order by attempt.route asc
      `,
    ]);

  const staleRunningAttempts = staleRunningRows.map((row) => ({
    attemptNo: row.attempt_no,
    startedAt: serializeTimestamp(row.started_at),
  }));
  const recentFailures = recentFailureRows.map((row) => ({
    scope: row.failure_scope,
    attemptNo: row.attempt_no,
    route: row.route,
    recordedAt: serializeTimestamp(row.recorded_at),
  }));
  const stepLatencyP95 = latencyRows.map((row) => ({
    stepName: row.step_name,
    p95LatencyMs: row.p95_latency_ms,
    sampleCount: row.sample_count,
  }));
  const routeCounts = routeCountRows.map((row) => ({
    route: row.route,
    count: row.route_count,
  }));

  if (staleRunningAttempts.length > 0) {
    return buildFailedCheck(
      "executions",
      "inbox_runtime_stuck_pipeline_attempts",
      "Inbox has pipeline attempts stuck in running state.",
      {
        staleRunningAttempts,
        recentFailures,
        stepLatencyP95,
        routeCounts,
      }
    );
  }

  if (recentFailures.length > 0) {
    return buildDegradedCheck(
      "executions",
      "inbox_runtime_recent_execution_failures",
      "Inbox execution telemetry shows recent failed attempts or steps.",
      {
        staleRunningAttempts,
        recentFailures,
        stepLatencyP95,
        routeCounts,
      }
    );
  }

  return buildOkCheck(
    "executions",
    "inbox_runtime_execution_telemetry_ok",
    "Inbox execution telemetry has no recent failures or stuck attempts.",
    {
      staleRunningAttempts,
      recentFailures,
      stepLatencyP95,
      routeCounts,
    }
  );
}

async function buildOperationalHealthCheck(
  availableTables: readonly string[]
): Promise<InboxRuntimeCheck> {
  const requiredBridgeTables = [
    "inbox_items",
    "inbox_pipeline_attempts",
    "inbox_step_runs",
    ...requiredInboxLearningBridgeTables,
  ] as const;
  const missingTables = requiredBridgeTables.filter(
    (tableName) => !availableTables.includes(tableName)
  );

  if (missingTables.length > 0) {
    return buildFailedCheck(
      "learning_bridge",
      "inbox_runtime_missing_learning_bridge_tables",
      "Inbox to Learning bridge could not be inspected.",
      {
        missingTables,
      }
    );
  }

  const [pendingReviewCountRows, pendingResolutionCountRows] =
    await Promise.all([
      sqlClient<{ pending_count: number }[]>`
        select count(*)::int as pending_count
        from learning.suggestion_batches as batch
        where batch.batch_type = 'inbox_review'
          and batch.status = 'pending'
      `,
      sqlClient<{ pending_count: number }[]>`
        select count(*)::int as pending_count
        from learning.suggestion_resolutions as resolution
        where resolution.apply_status = 'pending'
      `,
    ]);

  const pendingReviewCount = pendingReviewCountRows[0]?.pending_count ?? 0;
  const pendingResolutionCount =
    pendingResolutionCountRows[0]?.pending_count ?? 0;

  if (pendingReviewCount > 0 || pendingResolutionCount > 0) {
    return buildDegradedCheck(
      "learning_bridge",
      "inbox_runtime_learning_bridge_pending_work",
      "Inbox to Learning bridge has pending review work.",
      {
        pendingReviewCount,
        pendingResolutionCount,
      }
    );
  }

  return buildOkCheck(
    "learning_bridge",
    "inbox_runtime_learning_bridge_clear",
    "Inbox to Learning bridge is clear.",
    {
      pendingReviewCount,
      pendingResolutionCount,
    }
  );
}

export async function collectInboxRuntimeReport(): Promise<InboxRuntimeReport> {
  const envCheck = buildEnvCheck(env.INBOX_INTERNAL_RUNTIME_SECRET ?? null);
  const readinessCheck = buildReadinessCheck();

  let repoMigrations: string[] = [];
  let migrationReadFailed = false;
  try {
    repoMigrations = await readRepoAppMigrations();
  } catch {
    migrationReadFailed = true;
  }

  let availableTables: string[] | null = null;
  try {
    availableTables = await readAvailableInboxTables();
  } catch {
    availableTables = null;
  }

  const schemaCheck: InboxRuntimeCheck =
    availableTables === null
      ? buildFailedCheck(
          "schema",
          "inbox_runtime_schema_inspection_failed",
          "Inbox runtime tables could not be inspected.",
          {
            failureCode: "inbox_runtime_schema_inspection_failed",
          }
        )
      : buildSchemaCheck(availableTables);

  const ledgerPresent = availableTables?.includes("app_migrations") ?? false;

  let appliedMigrations: string[] = [];
  let appliedMigrationReadFailed = false;
  if (availableTables !== null) {
    try {
      appliedMigrations = await readAppliedAppMigrations(ledgerPresent);
    } catch {
      appliedMigrationReadFailed = true;
    }
  }

  const migrationsCheck: InboxRuntimeCheck =
    migrationReadFailed
      ? buildFailedCheck(
          "migrations",
          "inbox_runtime_repo_migrations_unavailable",
          "Repository app migrations could not be read.",
          {
            failureCode: "inbox_runtime_repo_migrations_unavailable",
          }
        )
      : appliedMigrationReadFailed
        ? buildFailedCheck(
            "migrations",
            "inbox_runtime_applied_migrations_unavailable",
            "Applied app migrations could not be read from the database.",
            {
              failureCode: "inbox_runtime_applied_migrations_unavailable",
            }
          )
        : buildMigrationDriftCheck({
            ledgerPresent,
            repoMigrations,
            appliedMigrations,
          });

  let itemsCheck: InboxRuntimeCheck;
  if (availableTables === null) {
    itemsCheck = buildFailedCheck(
      "items",
      "inbox_runtime_item_status_inspection_failed",
      "Inbox item failure status could not be inspected.",
      {
        failureCode: "inbox_runtime_item_status_inspection_failed",
      }
    );
  } else {
    try {
      itemsCheck = await buildItemsCheck(availableTables);
    } catch {
      itemsCheck = buildFailedCheck(
        "items",
        "inbox_runtime_item_status_inspection_failed",
        "Inbox item failure status could not be inspected.",
        {
          failureCode: "inbox_runtime_item_status_inspection_failed",
        }
      );
    }
  }

  let executionsCheck: InboxRuntimeCheck;
  if (availableTables === null) {
    executionsCheck = buildFailedCheck(
      "executions",
      "inbox_runtime_execution_telemetry_unavailable",
      "Inbox execution telemetry could not be inspected.",
      {
        failureCode: "inbox_runtime_execution_telemetry_unavailable",
      }
    );
  } else {
    try {
      executionsCheck = await buildExecutionsCheck(availableTables);
    } catch {
      executionsCheck = buildFailedCheck(
        "executions",
        "inbox_runtime_execution_telemetry_unavailable",
        "Inbox execution telemetry could not be inspected.",
        {
          failureCode: "inbox_runtime_execution_telemetry_unavailable",
        }
      );
    }
  }

  let learningBridgeCheck: InboxRuntimeCheck;
  if (availableTables === null) {
    learningBridgeCheck = buildFailedCheck(
      "learning_bridge",
      "inbox_runtime_learning_bridge_unavailable",
      "Inbox to Learning bridge could not be inspected.",
      {
        failureCode: "inbox_runtime_learning_bridge_unavailable",
      }
    );
  } else {
    try {
      learningBridgeCheck = await buildOperationalHealthCheck(availableTables);
    } catch {
      learningBridgeCheck = buildFailedCheck(
        "learning_bridge",
        "inbox_runtime_learning_bridge_unavailable",
        "Inbox to Learning bridge could not be inspected.",
        {
          failureCode: "inbox_runtime_learning_bridge_unavailable",
        }
      );
    }
  }

  const checks: InboxRuntimeCheck[] = [
    envCheck,
    readinessCheck,
    migrationsCheck,
    schemaCheck,
    itemsCheck,
    executionsCheck,
    learningBridgeCheck,
  ];

  return {
    status: deriveInboxRuntimeStatus(checks),
    generatedAt: new Date().toISOString(),
    checks,
  };
}

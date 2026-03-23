import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

import { desc } from "drizzle-orm";

import { resolveInternalAuthSecret } from "@/shared/auth/internal";
import { db, sqlClient } from "@/shared/db/client";
import { appMigrations } from "@/shared/db/schema";

export type InboxRuntimeCheckStatus = "ok" | "degraded" | "failed";
export type InboxRuntimeCheckName =
  | "env"
  | "migrations"
  | "schema"
  | "items"
  | "executions";

export type InboxRuntimeCheck = {
  name: InboxRuntimeCheckName;
  status: InboxRuntimeCheckStatus;
  message: string;
  details?: Record<string, unknown>;
};

export type InboxRuntimeReport = {
  status: InboxRuntimeCheckStatus;
  generatedAt: string;
  checks: InboxRuntimeCheck[];
};

type FailedInboxItemSample = {
  itemId: string;
  workspaceId: string | null;
  mapId: string | null;
  updatedAt: string;
  attemptNo: number | null;
  message: string | null;
};

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
const trackedInboxRuntimeTables = [
  ...requiredInboxRuntimeTables,
  ...requiredInboxExecutionTables,
] as const;

type MigrationDriftInput = {
  ledgerPresent: boolean;
  repoMigrations: readonly string[];
  appliedMigrations: readonly string[];
};

function buildFailedCheck(
  name: InboxRuntimeCheckName,
  message: string,
  details?: Record<string, unknown>
): InboxRuntimeCheck {
  if (details) {
    return {
      name,
      status: "failed",
      message,
      details,
    };
  }

  return {
    name,
    status: "failed",
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
    return {
      name: "migrations",
      status: "failed",
      message: "Inbox migration ledger table is missing.",
      details: {
        latestRepoMigration,
        latestAppliedMigration,
      },
    };
  }

  if (!latestRepoMigration) {
    return {
      name: "migrations",
      status: "failed",
      message: "No repository app migrations were found.",
      details: {
        latestRepoMigration,
        latestAppliedMigration,
      },
    };
  }

  if (!latestAppliedMigration) {
    return {
      name: "migrations",
      status: "failed",
      message: "No applied app migrations were recorded.",
      details: {
        latestRepoMigration,
        latestAppliedMigration,
      },
    };
  }

  if (latestAppliedMigration !== latestRepoMigration) {
    return {
      name: "migrations",
      status: "failed",
      message: "Inbox migration ledger is behind the repository.",
      details: {
        latestRepoMigration,
        latestAppliedMigration,
      },
    };
  }

  return {
    name: "migrations",
    status: "ok",
    message: "Inbox migration ledger matches the repository.",
    details: {
      latestRepoMigration,
      latestAppliedMigration,
    },
  };
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
      table_schema = 'app_private'
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
    return {
      name: "env",
      status: "failed",
      message: "INTERNAL_API_SECRET is not configured.",
      details: {
        requiredEnv: ["INTERNAL_API_SECRET"],
      },
    };
  }

  return {
    name: "env",
    status: "ok",
    message: "INTERNAL_API_SECRET is configured.",
    details: {
      requiredEnv: ["INTERNAL_API_SECRET"],
    },
  };
}

function buildSchemaCheck(
  availableTables: readonly string[]
): InboxRuntimeCheck {
  const missingTables = requiredInboxRuntimeTables.filter(
    (tableName) => !availableTables.includes(tableName)
  );

  if (missingTables.length > 0) {
    return {
      name: "schema",
      status: "failed",
      message: "Inbox runtime tables are missing.",
      details: {
        missingTables,
        requiredTables: [...requiredInboxRuntimeTables],
      },
    };
  }

  return {
    name: "schema",
    status: "ok",
    message: "Inbox runtime tables are available.",
    details: {
      requiredTables: [...requiredInboxRuntimeTables],
    },
  };
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
    return {
      name: "items",
      status: "failed",
      message: "Inbox failure status could not be inspected because required tables are missing.",
      details: {
        missingTables,
      },
    };
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
      item_id: string;
      workspace_id: string | null;
      map_id: string | null;
      updated_at: Date;
      attempt_no: number | null;
      message: string | null;
    }[]
  >`
    select
      item.id as item_id,
      item.workspace_id,
      item.map_id,
      item.updated_at,
      failure.attempt_no,
      failure.message
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
      itemId: row.item_id,
      workspaceId: row.workspace_id,
      mapId: row.map_id,
      updatedAt: row.updated_at.toISOString(),
      attemptNo: row.attempt_no,
      message: row.message,
    })
  );

  if (failedCount > 0) {
    return {
      name: "items",
      status: "degraded",
      message: "Inbox has items waiting for manual review.",
      details: {
        failedNeedsReviewCount: failedCount,
        sample,
      },
    };
  }

  return {
    name: "items",
    status: "ok",
    message: "Inbox has no failed items waiting for review.",
    details: {
      failedNeedsReviewCount: 0,
      sample,
    },
  };
}

export async function buildExecutionsCheck(
  availableTables: readonly string[]
): Promise<InboxRuntimeCheck> {
  const missingTables = requiredInboxExecutionTables.filter(
    (tableName) => !availableTables.includes(tableName)
  );

  if (missingTables.length > 0) {
    return {
      name: "executions",
      status: "failed",
      message: "Inbox execution telemetry tables are missing.",
      details: {
        missingTables,
        requiredTables: [...requiredInboxExecutionTables],
      },
    };
  }

  const [staleRunningRows, recentFailureRows, latencyRows, routeCountRows] =
    await Promise.all([
      sqlClient<
        {
          attempt_id: string;
          item_id: string;
          attempt_no: number;
          trigger_kind: string;
          started_at: Date;
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
          recorded_at: Date;
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
    attemptId: row.attempt_id,
    itemId: row.item_id,
    attemptNo: row.attempt_no,
    triggerKind: row.trigger_kind,
    startedAt: row.started_at.toISOString(),
  }));
  const recentFailures = recentFailureRows.map((row) => ({
    scope: row.failure_scope,
    itemId: row.item_id,
    attemptNo: row.attempt_no,
    stepName: row.step_name,
    route: row.route,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    recordedAt: row.recorded_at.toISOString(),
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
    return {
      name: "executions",
      status: "failed",
      message: "Inbox has pipeline attempts stuck in running state.",
      details: {
        staleRunningAttempts,
        recentFailures,
        stepLatencyP95,
        routeCounts,
      },
    };
  }

  if (recentFailures.length > 0) {
    return {
      name: "executions",
      status: "degraded",
      message: "Inbox execution telemetry shows recent failed attempts or steps.",
      details: {
        staleRunningAttempts,
        recentFailures,
        stepLatencyP95,
        routeCounts,
      },
    };
  }

  return {
    name: "executions",
    status: "ok",
    message: "Inbox execution telemetry has no recent failures or stuck attempts.",
    details: {
      staleRunningAttempts,
      recentFailures,
      stepLatencyP95,
      routeCounts,
    },
  };
}

export async function collectInboxRuntimeReport(): Promise<InboxRuntimeReport> {
  const envCheck = buildEnvCheck(resolveInternalAuthSecret());

  let repoMigrations: string[] = [];
  let migrationReadError: string | null = null;
  try {
    repoMigrations = await readRepoAppMigrations();
  } catch (error) {
    migrationReadError =
      error instanceof Error
        ? error.message
        : "Unable to read repository migration files.";
  }

  let availableTables: string[] | null = null;
  let schemaReadError: string | null = null;
  try {
    availableTables = await readAvailableInboxTables();
  } catch (error) {
    schemaReadError =
      error instanceof Error
        ? error.message
        : "Unable to inspect Inbox runtime tables.";
  }

  const schemaCheck: InboxRuntimeCheck =
    availableTables === null
      ? buildFailedCheck(
          "schema",
          "Inbox runtime tables could not be inspected.",
          {
            reason: schemaReadError,
          }
        )
      : buildSchemaCheck(availableTables);

  const ledgerPresent = availableTables?.includes("app_migrations") ?? false;

  let appliedMigrations: string[] = [];
  let appliedMigrationError: string | null = null;
  if (availableTables !== null) {
    try {
      appliedMigrations = await readAppliedAppMigrations(ledgerPresent);
    } catch (error) {
      appliedMigrationError =
        error instanceof Error
          ? error.message
          : "Unable to read applied app migrations.";
    }
  }

  const migrationsCheck: InboxRuntimeCheck =
    migrationReadError !== null
      ? buildFailedCheck(
          "migrations",
          "Repository app migrations could not be read.",
          {
            reason: migrationReadError,
          }
        )
      : appliedMigrationError !== null
        ? buildFailedCheck(
            "migrations",
            "Applied app migrations could not be read from the database.",
            {
              reason: appliedMigrationError,
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
      "Inbox item failure status could not be inspected.",
      {
        reason: schemaReadError,
      }
    );
  } else {
    try {
      itemsCheck = await buildItemsCheck(availableTables);
    } catch (error) {
      itemsCheck = buildFailedCheck(
        "items",
        "Inbox item failure status could not be inspected.",
        {
          reason:
            error instanceof Error
              ? error.message
              : "Unable to inspect failed Inbox items.",
        }
      );
    }
  }

  let executionsCheck: InboxRuntimeCheck;
  if (availableTables === null) {
    executionsCheck = buildFailedCheck(
      "executions",
      "Inbox execution telemetry could not be inspected.",
      {
        reason: schemaReadError,
      }
    );
  } else {
    try {
      executionsCheck = await buildExecutionsCheck(availableTables);
    } catch (error) {
      executionsCheck = buildFailedCheck(
        "executions",
        "Inbox execution telemetry could not be inspected.",
        {
          reason:
            error instanceof Error
              ? error.message
              : "Unable to inspect Inbox execution telemetry.",
        }
      );
    }
  }

  const checks: InboxRuntimeCheck[] = [
    envCheck,
    migrationsCheck,
    schemaCheck,
    itemsCheck,
    executionsCheck,
  ];

  return {
    status: deriveInboxRuntimeStatus(checks),
    generatedAt: new Date().toISOString(),
    checks,
  };
}

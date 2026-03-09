import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { maps, scenarioRunSteps, scenarioRuns, scenarios, users } from "@/shared/db/schema";

export async function listScenarioRunsForMap(
  mapId: string,
  workspaceId: string,
  limit = 6
) {
  const runs = await db
    .select({
      id: scenarioRuns.id,
      scenarioId: scenarioRuns.scenarioId,
      triggerText: scenarioRuns.triggerText,
      status: scenarioRuns.status,
      summary: scenarioRuns.summary,
      createdAt: scenarioRuns.createdAt,
      starter: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      scenario: {
        id: scenarios.id,
        title: scenarios.title,
      },
    })
    .from(scenarioRuns)
    .innerJoin(users, eq(scenarioRuns.startedByUserId, users.id))
    .leftJoin(scenarios, eq(scenarioRuns.scenarioId, scenarios.id))
    .where(and(eq(scenarioRuns.mapId, mapId), eq(scenarioRuns.workspaceId, workspaceId)))
    .orderBy(desc(scenarioRuns.createdAt))
    .limit(limit);

  const runIds = runs.map((run) => run.id);
  if (runIds.length === 0) {
    return [];
  }

  const steps = await db
    .select({
      id: scenarioRunSteps.id,
      scenarioRunId: scenarioRunSteps.scenarioRunId,
      stepOrder: scenarioRunSteps.stepOrder,
      conceptId: scenarioRunSteps.conceptId,
      viaLinkId: scenarioRunSteps.viaLinkId,
      effectType: scenarioRunSteps.effectType,
      explanation: scenarioRunSteps.explanation,
      score: scenarioRunSteps.score,
    })
    .from(scenarioRunSteps)
    .where(inArray(scenarioRunSteps.scenarioRunId, runIds));

  const stepsByRunId = new Map<string, typeof steps>();
  for (const step of steps) {
    const bucket = stepsByRunId.get(step.scenarioRunId) ?? [];
    bucket.push(step);
    stepsByRunId.set(step.scenarioRunId, bucket);
  }

  return runs.map((run) => ({
    ...run,
    steps:
      stepsByRunId.get(run.id)?.sort(
        (left, right) => left.stepOrder - right.stepOrder
      ) ?? [],
  }));
}

export async function listScenarioRunsForWorkspace(
  workspaceId: string,
  limit = 6
) {
  return db
    .select({
      id: scenarioRuns.id,
      mapId: scenarioRuns.mapId,
      triggerText: scenarioRuns.triggerText,
      status: scenarioRuns.status,
      summary: scenarioRuns.summary,
      createdAt: scenarioRuns.createdAt,
      map: {
        title: maps.title,
      },
      starter: {
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(scenarioRuns)
    .innerJoin(maps, eq(scenarioRuns.mapId, maps.id))
    .innerJoin(users, eq(scenarioRuns.startedByUserId, users.id))
    .where(eq(scenarioRuns.workspaceId, workspaceId))
    .orderBy(desc(scenarioRuns.createdAt))
    .limit(limit);
}

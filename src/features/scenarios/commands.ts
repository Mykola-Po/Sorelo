import "server-only";

import { and, eq } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  requireActiveMap,
  requireWorkspaceMembership,
} from "@/features/maps/access";
import { fallbackMapTitleFromSituation } from "@/features/maps/utils";
import { runRuleBasedScenario } from "@/features/scenarios/engine";
import { db } from "@/shared/db/client";
import {
  concepts,
  links,
  scenarioRunSteps,
  scenarioRuns,
  scenarios,
} from "@/shared/db/schema";

export async function createScenarioCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  title?: string | null;
  situation: string;
  seedConceptIds: string[];
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  return db.transaction(async (tx) => {
    const [scenario] = await tx
      .insert(scenarios)
      .values({
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        createdByUserId: input.actorUserId,
        title:
          input.title?.trim() || fallbackMapTitleFromSituation(input.situation),
        situation: input.situation,
        seedConceptIds: input.seedConceptIds,
      })
      .returning();

    if (!scenario) {
      throw new Error("Scenario creation failed.");
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "scenario",
      entityId: scenario.id,
      action: "scenario.created",
      payload: {
        title: scenario.title,
      },
    });

    return scenario;
  });
}

async function loadScenarioGraph(workspaceId: string, mapId: string) {
  const [graphConcepts, graphLinks] = await Promise.all([
    db
      .select({
        id: concepts.id,
        title: concepts.title,
        summary: concepts.summary,
        description: concepts.description,
      })
      .from(concepts)
      .where(and(eq(concepts.workspaceId, workspaceId), eq(concepts.mapId, mapId))),
    db
      .select({
        id: links.id,
        sourceConceptId: links.sourceConceptId,
        targetConceptId: links.targetConceptId,
        relationType: links.relationType,
        strength: links.strength,
      })
      .from(links)
      .where(and(eq(links.workspaceId, workspaceId), eq(links.mapId, mapId))),
  ]);

  return {
    concepts: graphConcepts,
    links: graphLinks,
  };
}

export async function runScenarioCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  scenarioId?: string | null;
  triggerText?: string | null;
  seedConceptIds?: string[];
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const scenario =
    input.scenarioId && input.scenarioId.length > 0
      ? await db.query.scenarios.findFirst({
          where: and(
            eq(scenarios.id, input.scenarioId),
            eq(scenarios.workspaceId, input.workspaceId),
            eq(scenarios.mapId, input.mapId)
          ),
        })
      : null;

  const triggerText = input.triggerText?.trim() || scenario?.situation || "";
  const seedConceptIds =
    input.seedConceptIds && input.seedConceptIds.length > 0
      ? input.seedConceptIds
      : scenario?.seedConceptIds ?? [];

  if (!triggerText) {
    throw new Error("Scenario trigger text is required.");
  }

  const graph = await loadScenarioGraph(input.workspaceId, input.mapId);
  const [run] = await db
    .insert(scenarioRuns)
    .values({
      scenarioId: scenario?.id ?? null,
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      triggerText,
      startedByUserId: input.actorUserId,
      status: "pending",
    })
    .returning();

  if (!run) {
    throw new Error("Scenario run could not be created.");
  }

  try {
    const result = runRuleBasedScenario({
      triggerText,
      concepts: graph.concepts,
      links: graph.links,
      seedConceptIds,
    });

    await db.transaction(async (tx) => {
      if (result.steps.length > 0) {
        await tx.insert(scenarioRunSteps).values(
          result.steps.map((step, index) => ({
            scenarioRunId: run.id,
            stepOrder: index + 1,
            conceptId: step.conceptId,
            viaLinkId: step.viaLinkId,
            effectType: step.effectType,
            explanation: step.explanation,
            score: step.score,
          }))
        );
      }

      await tx
        .update(scenarioRuns)
        .set({
          status: "completed",
          summary: result.summary,
        })
        .where(eq(scenarioRuns.id, run.id));

      await recordActivity(tx, {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        entityType: "scenario_run",
        entityId: run.id,
        action: "scenario.run",
        payload: {
          scenarioId: scenario?.id ?? null,
          summary: result.summary,
          steps: result.steps.length,
        },
      });
    });

    return run.id;
  } catch (error) {
    await db
      .update(scenarioRuns)
      .set({
        status: "failed",
        summary:
          error instanceof Error
            ? error.message
            : "Scenario run failed unexpectedly.",
      })
      .where(eq(scenarioRuns.id, run.id));

    throw error;
  }
}

import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  requireActiveMap,
  requireWorkspaceGraphEditAccess,
  requireWorkspaceLearningReviewAccess,
} from "@/features/maps/access";
import { fallbackMapTitleFromSituation } from "@/features/maps/utils";
import { runRuleBasedScenario } from "@/features/scenarios/engine";
import { db } from "@/shared/db/client";
import {
  learningScenarioRunFeedback,
  learningScenarioStepFeedback,
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
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
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
      .where(
        and(
          eq(concepts.workspaceId, workspaceId),
          eq(concepts.mapId, mapId),
          isNull(concepts.archivedAt)
        )
      ),
    db
      .select({
        id: links.id,
        sourceConceptId: links.sourceConceptId,
        targetConceptId: links.targetConceptId,
        relationType: links.relationType,
        strength: links.strength,
      })
      .from(links)
      .where(
        and(
          eq(links.workspaceId, workspaceId),
          eq(links.mapId, mapId),
          isNull(links.archivedAt)
        )
      ),
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
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
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
      : (scenario?.seedConceptIds ?? []);

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

async function requireScenarioRunForMap(input: {
  workspaceId: string;
  mapId: string;
  scenarioRunId: string;
}) {
  const [run] = await db
    .select({
      id: scenarioRuns.id,
      status: scenarioRuns.status,
    })
    .from(scenarioRuns)
    .where(
      and(
        eq(scenarioRuns.id, input.scenarioRunId),
        eq(scenarioRuns.workspaceId, input.workspaceId),
        eq(scenarioRuns.mapId, input.mapId)
      )
    )
    .limit(1);

  if (!run) {
    throw new Error("Scenario run not found.");
  }

  if (run.status === "pending") {
    throw new Error("Scenario run is still pending.");
  }

  return run;
}

async function requireScenarioStepForRun(input: {
  scenarioRunId: string;
  scenarioRunStepId: string;
}) {
  const [step] = await db
    .select({
      id: scenarioRunSteps.id,
    })
    .from(scenarioRunSteps)
    .where(
      and(
        eq(scenarioRunSteps.id, input.scenarioRunStepId),
        eq(scenarioRunSteps.scenarioRunId, input.scenarioRunId)
      )
    )
    .limit(1);

  if (!step) {
    throw new Error("Scenario step not found.");
  }

  return step;
}

export async function upsertScenarioRunFeedbackCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  scenarioRunId: string;
  overallScore: number;
  verdict: (typeof learningScenarioRunFeedback.$inferInsert)["verdict"];
  feedbackText?: string | null;
}) {
  await requireWorkspaceLearningReviewAccess(
    input.workspaceId,
    input.actorUserId
  );
  await requireActiveMap(input.workspaceId, input.mapId);
  await requireScenarioRunForMap({
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    scenarioRunId: input.scenarioRunId,
  });

  const [feedback] = await db
    .insert(learningScenarioRunFeedback)
    .values({
      scenarioRunId: input.scenarioRunId,
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      reviewerUserId: input.actorUserId,
      overallScore: input.overallScore,
      verdict: input.verdict,
      feedbackText: input.feedbackText?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [
        learningScenarioRunFeedback.scenarioRunId,
        learningScenarioRunFeedback.reviewerUserId,
      ],
      set: {
        overallScore: input.overallScore,
        verdict: input.verdict,
        feedbackText: input.feedbackText?.trim() || null,
        createdAt: new Date(),
      },
    })
    .returning();

  if (!feedback) {
    throw new Error("Scenario run feedback could not be saved.");
  }

  await db.transaction(async (tx) => {
    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "scenario_run",
      entityId: input.scenarioRunId,
      action: "scenario.feedback.run",
      payload: {
        verdict: input.verdict,
        overallScore: input.overallScore,
      },
    });
  });

  return feedback;
}

export async function upsertScenarioStepFeedbackCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  scenarioRunId: string;
  scenarioRunStepId: string;
  verdict: (typeof learningScenarioStepFeedback.$inferInsert)["verdict"];
  correctedExplanation?: string | null;
  correctedScore?: number | null;
}) {
  await requireWorkspaceLearningReviewAccess(
    input.workspaceId,
    input.actorUserId
  );
  await requireActiveMap(input.workspaceId, input.mapId);
  await requireScenarioRunForMap({
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    scenarioRunId: input.scenarioRunId,
  });
  await requireScenarioStepForRun({
    scenarioRunId: input.scenarioRunId,
    scenarioRunStepId: input.scenarioRunStepId,
  });

  const [feedback] = await db
    .insert(learningScenarioStepFeedback)
    .values({
      scenarioRunStepId: input.scenarioRunStepId,
      scenarioRunId: input.scenarioRunId,
      verdict: input.verdict,
      correctedExplanation: input.correctedExplanation?.trim() || null,
      correctedScore: input.correctedScore ?? null,
      reviewerUserId: input.actorUserId,
    })
    .onConflictDoUpdate({
      target: [
        learningScenarioStepFeedback.scenarioRunStepId,
        learningScenarioStepFeedback.reviewerUserId,
      ],
      set: {
        verdict: input.verdict,
        correctedExplanation: input.correctedExplanation?.trim() || null,
        correctedScore: input.correctedScore ?? null,
        createdAt: new Date(),
      },
    })
    .returning();

  if (!feedback) {
    throw new Error("Scenario step feedback could not be saved.");
  }

  await db.transaction(async (tx) => {
    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "scenario_run",
      entityId: input.scenarioRunId,
      action: "scenario.feedback.step",
      payload: {
        scenarioRunStepId: input.scenarioRunStepId,
        verdict: input.verdict,
      },
    });
  });

  return feedback;
}

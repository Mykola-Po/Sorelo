import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/shared/db/client";
import {
  concepts,
  learningScenarioRunFeedback,
  learningScenarioStepFeedback,
  links,
  maps,
  scenarioRunSteps,
  scenarioRuns,
  scenarios,
  users,
} from "@/shared/db/schema";

export async function listScenarioRunsForMap(
  mapId: string,
  workspaceId: string,
  options?: {
    limit?: number;
    reviewerUserId?: string;
  }
) {
  const limit = options?.limit ?? 6;
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
    .where(
      and(
        eq(scenarioRuns.mapId, mapId),
        eq(scenarioRuns.workspaceId, workspaceId)
      )
    )
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

  const conceptIds = Array.from(new Set(steps.map((step) => step.conceptId)));
  const linkIds = Array.from(
    new Set(
      steps
        .map((step) => step.viaLinkId)
        .filter((linkId): linkId is string => Boolean(linkId))
    )
  );

  const [stepConcepts, stepLinks] = await Promise.all([
    conceptIds.length > 0
      ? db
          .select({
            id: concepts.id,
            title: concepts.title,
          })
          .from(concepts)
          .where(
            and(
              eq(concepts.mapId, mapId),
              eq(concepts.workspaceId, workspaceId),
              isNull(concepts.archivedAt),
              inArray(concepts.id, conceptIds)
            )
          )
      : [],
    linkIds.length > 0
      ? db
          .select({
            id: links.id,
            relationType: links.relationType,
          })
          .from(links)
          .where(
            and(
              eq(links.mapId, mapId),
              eq(links.workspaceId, workspaceId),
              inArray(links.id, linkIds)
            )
          )
      : [],
  ]);

  const conceptTitleById = new Map(
    stepConcepts.map((concept) => [concept.id, concept.title])
  );
  const linkRelationById = new Map(
    stepLinks.map((link) => [link.id, link.relationType])
  );

  type EnrichedStep = (typeof steps)[number] & {
    conceptTitle: string;
    viaLinkRelationType: (typeof stepLinks)[number]["relationType"] | null;
    feedback: {
      id: string;
      verdict: typeof learningScenarioStepFeedback.$inferSelect.verdict;
      correctedExplanation: string | null;
      correctedScore: number | null;
      createdAt: string;
    } | null;
  };

  const runFeedbackRows = options?.reviewerUserId
    ? await db
        .select({
          id: learningScenarioRunFeedback.id,
          scenarioRunId: learningScenarioRunFeedback.scenarioRunId,
          verdict: learningScenarioRunFeedback.verdict,
          overallScore: learningScenarioRunFeedback.overallScore,
          feedbackText: learningScenarioRunFeedback.feedbackText,
          createdAt: learningScenarioRunFeedback.createdAt,
        })
        .from(learningScenarioRunFeedback)
        .where(
          and(
            inArray(learningScenarioRunFeedback.scenarioRunId, runIds),
            eq(
              learningScenarioRunFeedback.reviewerUserId,
              options.reviewerUserId
            )
          )
        )
    : [];

  const stepIds = steps.map((step) => step.id);
  const stepFeedbackRows =
    options?.reviewerUserId && stepIds.length > 0
      ? await db
          .select({
            id: learningScenarioStepFeedback.id,
            scenarioRunStepId: learningScenarioStepFeedback.scenarioRunStepId,
            verdict: learningScenarioStepFeedback.verdict,
            correctedExplanation:
              learningScenarioStepFeedback.correctedExplanation,
            correctedScore: learningScenarioStepFeedback.correctedScore,
            createdAt: learningScenarioStepFeedback.createdAt,
          })
          .from(learningScenarioStepFeedback)
          .where(
            and(
              inArray(learningScenarioStepFeedback.scenarioRunStepId, stepIds),
              eq(
                learningScenarioStepFeedback.reviewerUserId,
                options.reviewerUserId
              )
            )
          )
      : [];

  const runFeedbackByRunId = new Map(
    runFeedbackRows.map((feedback) => [
      feedback.scenarioRunId,
      {
        ...feedback,
        createdAt: feedback.createdAt.toISOString(),
      },
    ])
  );

  const stepFeedbackByStepId = new Map(
    stepFeedbackRows.map((feedback) => [
      feedback.scenarioRunStepId,
      {
        ...feedback,
        createdAt: feedback.createdAt.toISOString(),
      },
    ])
  );

  const stepsByRunId = new Map<string, EnrichedStep[]>();
  for (const step of steps) {
    const bucket = stepsByRunId.get(step.scenarioRunId) ?? [];
    bucket.push({
      ...step,
      conceptTitle: conceptTitleById.get(step.conceptId) ?? "Unknown concept",
      viaLinkRelationType: step.viaLinkId
        ? (linkRelationById.get(step.viaLinkId) ?? null)
        : null,
      feedback: stepFeedbackByStepId.get(step.id) ?? null,
    });
    stepsByRunId.set(step.scenarioRunId, bucket);
  }

  return runs.map((run) => ({
    ...run,
    createdAt: run.createdAt.toISOString(),
    feedback: runFeedbackByRunId.get(run.id) ?? null,
    steps:
      stepsByRunId
        .get(run.id)
        ?.sort((left, right) => left.stepOrder - right.stepOrder) ?? [],
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

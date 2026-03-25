import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";

import {
  mapInboxAtomRecord,
  mapInboxClarificationAnswerRecord,
  mapInboxClarificationRequestRecord,
  mapInboxExecutionAttemptRecord,
  mapInboxFragmentRecord,
  mapInboxHypothesisRecord,
  mapInboxItemRecord,
  mapInboxMergeCandidateRecord,
  mapInboxStepRunRecord,
  mapInboxStructuredPacketRecord,
  mapInboxWorkflowEventRecord,
} from "@/features/inbox/mappers";
import type {
  InboxItemDetailRecord,
  InboxItemRecord,
  InboxWorkspaceClarificationRequestRecord,
} from "@/features/inbox/types";
import { db } from "@/shared/db/client";
import {
  inboxAtoms,
  inboxClarificationAnswers,
  inboxClarificationRequests,
  inboxFragments,
  inboxHypotheses,
  inboxItems,
  inboxMergeCandidates,
  inboxPipelineAttempts,
  inboxStructuredPackets,
  inboxStepRuns,
  inboxWorkflowEvents,
  learningSuggestionBatches,
  learningSuggestionResolutions,
  learningSuggestions,
} from "@/shared/db/schema";

export async function getInboxItemDetailQuery(itemId: string) {
  const [itemRow] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!itemRow) {
    return null;
  }

  const [
    fragmentRows,
    hypothesisRows,
    atomRows,
    packetRows,
    reviewBatchRows,
    mergeCandidateRows,
    clarificationRequestRows,
    attemptRows,
    stepRunRows,
    workflowEventRows,
  ] = await Promise.all([
    db
      .select()
      .from(inboxFragments)
      .where(eq(inboxFragments.itemId, itemId))
      .orderBy(asc(inboxFragments.ordinal)),
    db
      .select()
      .from(inboxHypotheses)
      .where(eq(inboxHypotheses.itemId, itemId))
      .orderBy(asc(inboxHypotheses.rank)),
    db
      .select()
      .from(inboxAtoms)
      .where(eq(inboxAtoms.itemId, itemId)),
    db
      .select()
      .from(inboxStructuredPackets)
      .where(eq(inboxStructuredPackets.itemId, itemId)),
    db
      .select({
        batch: learningSuggestionBatches,
        suggestion: learningSuggestions,
        resolution: learningSuggestionResolutions,
      })
      .from(learningSuggestionBatches)
      .leftJoin(
        learningSuggestions,
        eq(learningSuggestionBatches.id, learningSuggestions.batchId)
      )
      .leftJoin(
        learningSuggestionResolutions,
        eq(learningSuggestions.id, learningSuggestionResolutions.suggestionId)
      )
      .where(eq(learningSuggestionBatches.inboxItemId, itemId))
      .orderBy(
        desc(learningSuggestionBatches.startedAt),
        asc(learningSuggestions.artifactOrder),
        asc(learningSuggestions.createdAt)
      ),
    db
      .select()
      .from(inboxMergeCandidates)
      .where(eq(inboxMergeCandidates.itemId, itemId)),
    db
      .select()
      .from(inboxClarificationRequests)
      .where(eq(inboxClarificationRequests.itemId, itemId)),
    db
      .select()
      .from(inboxPipelineAttempts)
      .where(eq(inboxPipelineAttempts.itemId, itemId))
      .orderBy(desc(inboxPipelineAttempts.attemptNo)),
    db
      .select({
        stepRun: inboxStepRuns,
        attemptItemId: inboxPipelineAttempts.itemId,
      })
      .from(inboxStepRuns)
      .innerJoin(
        inboxPipelineAttempts,
        eq(inboxStepRuns.attemptId, inboxPipelineAttempts.id)
      )
      .where(eq(inboxPipelineAttempts.itemId, itemId))
      .orderBy(
        asc(inboxPipelineAttempts.attemptNo),
        asc(inboxStepRuns.stepOrder),
        asc(inboxStepRuns.runNo),
        asc(inboxStepRuns.startedAt)
      ),
    db
      .select()
      .from(inboxWorkflowEvents)
      .where(eq(inboxWorkflowEvents.itemId, itemId))
      .orderBy(asc(inboxWorkflowEvents.createdAt)),
  ]);

  const clarificationRequestIds = clarificationRequestRows.map((row) => row.id);
  const clarificationAnswerRows =
    clarificationRequestIds.length === 0
      ? []
      : await db
          .select()
          .from(inboxClarificationAnswers)
          .where(inArray(inboxClarificationAnswers.requestId, clarificationRequestIds));

  const reviewBatchMap = new Map<
    string,
    InboxItemDetailRecord["reviewBatches"][number]
  >();

  for (const row of reviewBatchRows) {
    const existing = reviewBatchMap.get(row.batch.id);
    if (existing) {
      if (row.suggestion) {
        existing.artifacts.push({
          id: row.suggestion.id,
          batchId: row.suggestion.batchId,
          artifactOrder: row.suggestion.artifactOrder,
          suggestionType: row.suggestion.suggestionType,
          targetEntityType: row.suggestion.targetEntityType,
          targetEntityId: row.suggestion.targetEntityId,
          proposedPayload: row.suggestion.proposedPayload,
          resolutionType: row.resolution?.resolutionType ?? null,
          applyStatus: row.resolution?.applyStatus ?? null,
          applyError: row.resolution?.applyError ?? null,
          reasonText: row.resolution?.reasonText ?? null,
          resolvedAt: row.resolution?.resolvedAt ?? null,
        });
      }
      continue;
    }

    reviewBatchMap.set(row.batch.id, {
      id: row.batch.id,
      inboxPacketId: row.batch.inboxPacketId,
      batchType: row.batch.batchType,
      status: row.batch.status,
      startedAt: row.batch.startedAt,
      finishedAt: row.batch.finishedAt,
      metadata: row.batch.metadata,
      artifacts: row.suggestion
        ? [
            {
              id: row.suggestion.id,
              batchId: row.suggestion.batchId,
              artifactOrder: row.suggestion.artifactOrder,
              suggestionType: row.suggestion.suggestionType,
              targetEntityType: row.suggestion.targetEntityType,
              targetEntityId: row.suggestion.targetEntityId,
              proposedPayload: row.suggestion.proposedPayload,
              resolutionType: row.resolution?.resolutionType ?? null,
              applyStatus: row.resolution?.applyStatus ?? null,
              applyError: row.resolution?.applyError ?? null,
              reasonText: row.resolution?.reasonText ?? null,
              resolvedAt: row.resolution?.resolvedAt ?? null,
            },
          ]
        : [],
    });
  }

  const stepRunsByAttemptId = new Map<
    string,
    InboxItemDetailRecord["attempts"][number]["steps"]
  >();

  for (const row of stepRunRows) {
    const existing = stepRunsByAttemptId.get(row.stepRun.attemptId) ?? [];
    existing.push(mapInboxStepRunRecord(row.stepRun));
    stepRunsByAttemptId.set(row.stepRun.attemptId, existing);
  }

  const detail: InboxItemDetailRecord = {
    item: mapInboxItemRecord(itemRow),
    fragments: fragmentRows.map(mapInboxFragmentRecord),
    hypotheses: hypothesisRows.map(mapInboxHypothesisRecord),
    atoms: atomRows.map(mapInboxAtomRecord),
    structuredPackets: packetRows.map(mapInboxStructuredPacketRecord),
    reviewBatches: [...reviewBatchMap.values()],
    mergeCandidates: mergeCandidateRows.map(mapInboxMergeCandidateRecord),
    clarificationRequests: clarificationRequestRows.map(
      mapInboxClarificationRequestRecord
    ),
    clarificationAnswers: clarificationAnswerRows.map(
      mapInboxClarificationAnswerRecord
    ),
    attempts: attemptRows.map((attemptRow) =>
      mapInboxExecutionAttemptRecord(
        attemptRow,
        stepRunsByAttemptId.get(attemptRow.id) ?? []
      )
    ),
    workflowEvents: workflowEventRows.map(mapInboxWorkflowEventRecord),
  };

  return detail;
}

function sortInboxItemsDescending(items: InboxItemRecord[]) {
  return [...items].sort((left, right) => {
    const updatedDelta = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

export async function listInboxItemsForWorkspaceQuery(
  workspaceId: string,
  limit = 50
) {
  const itemRows = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.workspaceId, workspaceId))
    .orderBy(desc(inboxItems.updatedAt), desc(inboxItems.createdAt));

  return sortInboxItemsDescending(
    itemRows
      .map(mapInboxItemRecord)
      .filter((item) => item.workspaceId === workspaceId)
  ).slice(0, limit);
}

export async function getInboxItemForWorkspaceQuery(
  workspaceId: string,
  itemId: string
) {
  const [itemRow] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!itemRow || itemRow.workspaceId !== workspaceId) {
    return null;
  }

  return mapInboxItemRecord(itemRow);
}

export async function getInboxItemDetailForWorkspaceQuery(
  workspaceId: string,
  itemId: string
) {
  const item = await getInboxItemForWorkspaceQuery(workspaceId, itemId);
  if (!item) {
    return null;
  }

  return getInboxItemDetailQuery(itemId);
}

export async function getInboxClarificationRequestForWorkspaceQuery(
  workspaceId: string,
  requestId: string
) {
  const [requestRow] = await db
    .select()
    .from(inboxClarificationRequests)
    .where(eq(inboxClarificationRequests.id, requestId))
    .limit(1);

  if (!requestRow) {
    return null;
  }

  const [itemRow] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, requestRow.itemId))
    .limit(1);

  if (!itemRow || itemRow.workspaceId !== workspaceId) {
    return null;
  }

  const request: InboxWorkspaceClarificationRequestRecord = {
    id: requestRow.id,
    itemId: requestRow.itemId,
    workspaceId,
    question: requestRow.question,
    reason: requestRow.reason,
    status: requestRow.status,
    answeredAt: requestRow.answeredAt,
  };

  return request;
}

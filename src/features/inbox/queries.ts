import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

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
  InboxListItemRecord,
  InboxListPageRecord,
  InboxListQueryInput,
  InboxWorkspaceClarificationRequestRecord,
} from "@/features/inbox/types";
import { db } from "@/shared/db/client";
import { workspaceMapPath } from "@/shared/config/routes";
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
  maps,
} from "@/shared/db/schema";

const needsAttentionExcludedStatuses = new Set(["applied", "discarded"]);
const processableStatuses = new Set([
  "received",
  "persisted",
  "normalized",
  "segmented",
  "interpreted",
  "scored",
  "resolved",
]);

async function getInboxItemRowForWorkspace(
  workspaceId: string,
  itemId: string
) {
  const [itemRow] = await db
    .select()
    .from(inboxItems)
    .where(
      and(eq(inboxItems.id, itemId), eq(inboxItems.workspaceId, workspaceId))
    )
    .limit(1);

  if (!itemRow) {
    return null;
  }

  if (itemRow.id !== itemId || itemRow.workspaceId !== workspaceId) {
    return null;
  }

  return itemRow;
}

async function buildInboxItemDetail(itemRow: typeof inboxItems.$inferSelect) {
  const itemId = itemRow.id;

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
    db.select().from(inboxAtoms).where(eq(inboxAtoms.itemId, itemId)),
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
          .where(
            inArray(
              inboxClarificationAnswers.requestId,
              clarificationRequestIds
            )
          );

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

  return {
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
  } satisfies InboxItemDetailRecord;
}

function sortInboxItems(
  items: InboxListItemRecord[],
  sort: InboxListQueryInput["listState"]["sort"]
) {
  return [...items].sort((left, right) => {
    if (sort === "updated_asc") {
      const updatedDelta = left.updatedAt.getTime() - right.updatedAt.getTime();
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    }

    if (sort === "created_desc") {
      const createdDelta = right.createdAt.getTime() - left.createdAt.getTime();
      if (createdDelta !== 0) {
        return createdDelta;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    }

    const updatedDelta = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

function matchesListState(
  item: InboxItemRecord,
  listState: InboxListQueryInput["listState"]
) {
  if (
    listState.view === "needs-attention" &&
    needsAttentionExcludedStatuses.has(item.status)
  ) {
    return false;
  }

  if (listState.status !== "any" && item.status !== listState.status) {
    return false;
  }

  if (listState.route !== "any" && item.route !== listState.route) {
    return false;
  }

  if (listState.mapId !== "any" && item.mapId !== listState.mapId) {
    return false;
  }

  return true;
}

function deriveNextAction(item: InboxItemRecord, workspaceSlug: string) {
  if (item.status === "clarification_requested") {
    return {
      nextActionKind: "answer_clarification" as const,
      nextActionLabel: "Answer clarification",
      nextActionHref: null,
    };
  }

  if (item.status === "failed_needs_review") {
    return {
      nextActionKind: "retry_processing" as const,
      nextActionLabel: "Retry processing",
      nextActionHref: null,
    };
  }

  if (processableStatuses.has(item.status)) {
    return {
      nextActionKind: "process_item" as const,
      nextActionLabel: "Process item",
      nextActionHref: null,
    };
  }

  if (item.status === "ready_for_review" || item.status === "promoted") {
    return {
      nextActionKind: "review_learning" as const,
      nextActionLabel: "Review in Learning",
      nextActionHref: `${workspaceMapPath(workspaceSlug, item.mapId)}?panel=learning`,
    };
  }

  if (item.status === "parked") {
    return {
      nextActionKind: "open_map" as const,
      nextActionLabel: "Open Map",
      nextActionHref: workspaceMapPath(workspaceSlug, item.mapId),
    };
  }

  if (item.status === "discarded" || item.status === "applied") {
    return {
      nextActionKind: "closed" as const,
      nextActionLabel: "Closed outcome",
      nextActionHref: workspaceMapPath(workspaceSlug, item.mapId),
    };
  }

  return {
    nextActionKind: "none" as const,
    nextActionLabel: "Open triage",
    nextActionHref: null,
  };
}

export async function getInboxItemDetailQuery(input: {
  workspaceId: string;
  itemId: string;
}) {
  const itemRow = await getInboxItemRowForWorkspace(
    input.workspaceId,
    input.itemId
  );

  if (!itemRow) {
    return null;
  }

  return buildInboxItemDetail(itemRow);
}

export async function listInboxItemsForWorkspaceQuery(
  input: InboxListQueryInput
): Promise<InboxListPageRecord> {
  const [itemRows, mapRows] = await Promise.all([
    db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.workspaceId, input.workspaceId))
      .orderBy(desc(inboxItems.updatedAt), desc(inboxItems.createdAt)),
    db
      .select({
        id: maps.id,
        title: maps.title,
        subjectLabel: maps.subjectLabel,
      })
      .from(maps)
      .where(
        and(eq(maps.workspaceId, input.workspaceId), isNull(maps.archivedAt))
      )
      .orderBy(desc(maps.updatedAt), maps.title),
  ]);

  const mapLookup = new Map(
    mapRows.map((row) => [
      row.id,
      {
        title: row.title,
        subjectLabel: row.subjectLabel,
      },
    ])
  );

  const allItems = itemRows
    .map((row) => {
      const item = mapInboxItemRecord(row);
      const mapInfo = mapLookup.get(item.mapId) ?? null;
      const nextAction = deriveNextAction(item, input.workspaceSlug);

      return {
        ...item,
        mapTitle: mapInfo?.title ?? null,
        mapSubjectLabel: mapInfo?.subjectLabel ?? null,
        ownerLabel: null,
        ...nextAction,
      } satisfies InboxListItemRecord;
    })
    .filter((item) => item.workspaceId === input.workspaceId);

  const filteredItems = allItems.filter((item) =>
    matchesListState(item, input.listState)
  );
  const sortedItems = sortInboxItems(filteredItems, input.listState.sort);
  const totalCount = sortedItems.length;
  const totalPages =
    totalCount === 0
      ? 1
      : Math.max(1, Math.ceil(totalCount / input.listState.pageSize));
  const page = Math.min(input.listState.page, totalPages);
  const pageStart = (page - 1) * input.listState.pageSize;

  return {
    items: sortedItems.slice(pageStart, pageStart + input.listState.pageSize),
    totalCount,
    totalPages,
    page,
    pageSize: input.listState.pageSize,
    view: input.listState.view,
    status: input.listState.status,
    route: input.listState.route,
    mapId: input.listState.mapId,
    sort: input.listState.sort,
  };
}

export async function getInboxItemForWorkspaceQuery(
  workspaceId: string,
  itemId: string
) {
  const itemRow = await getInboxItemRowForWorkspace(workspaceId, itemId);
  if (!itemRow) {
    return null;
  }

  return mapInboxItemRecord(itemRow);
}

export async function getInboxItemDetailForWorkspaceQuery(
  workspaceId: string,
  itemId: string
) {
  return getInboxItemDetailQuery({ workspaceId, itemId });
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

  const itemRow = await getInboxItemRowForWorkspace(
    workspaceId,
    requestRow.itemId
  );

  if (!itemRow) {
    return null;
  }

  return {
    id: requestRow.id,
    itemId: requestRow.itemId,
    workspaceId,
    question: requestRow.question,
    reason: requestRow.reason,
    status: requestRow.status,
    answeredAt: requestRow.answeredAt,
  } satisfies InboxWorkspaceClarificationRequestRecord;
}

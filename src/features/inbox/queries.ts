import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";

import {
  mapInboxAtomRecord,
  mapInboxClarificationAnswerRecord,
  mapInboxClarificationRequestRecord,
  mapInboxFragmentRecord,
  mapInboxHypothesisRecord,
  mapInboxItemRecord,
  mapInboxMergeCandidateRecord,
  mapInboxStructuredPacketRecord,
  mapInboxWorkflowEventRecord,
} from "@/features/inbox/mappers";
import type {
  InboxItemDetailRecord,
  InboxItemRecord,
  InboxOwnedClarificationRequestRecord,
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
  inboxStructuredPackets,
  inboxWorkflowEvents,
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
    mergeCandidateRows,
    clarificationRequestRows,
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
      .select()
      .from(inboxMergeCandidates)
      .where(eq(inboxMergeCandidates.itemId, itemId)),
    db
      .select()
      .from(inboxClarificationRequests)
      .where(eq(inboxClarificationRequests.itemId, itemId)),
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

  const detail: InboxItemDetailRecord = {
    item: mapInboxItemRecord(itemRow),
    fragments: fragmentRows.map(mapInboxFragmentRecord),
    hypotheses: hypothesisRows.map(mapInboxHypothesisRecord),
    atoms: atomRows.map(mapInboxAtomRecord),
    structuredPackets: packetRows.map(mapInboxStructuredPacketRecord),
    mergeCandidates: mergeCandidateRows.map(mapInboxMergeCandidateRecord),
    clarificationRequests: clarificationRequestRows.map(
      mapInboxClarificationRequestRecord
    ),
    clarificationAnswers: clarificationAnswerRows.map(
      mapInboxClarificationAnswerRecord
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

export async function listInboxItemsForUserQuery(userId: string, limit = 50) {
  const itemRows = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.userId, userId))
    .orderBy(desc(inboxItems.updatedAt), desc(inboxItems.createdAt));

  return sortInboxItemsDescending(
    itemRows
      .map(mapInboxItemRecord)
      .filter((item) => item.userId === userId)
  ).slice(0, limit);
}

export async function getInboxItemForUserQuery(userId: string, itemId: string) {
  const [itemRow] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!itemRow || itemRow.userId !== userId) {
    return null;
  }

  return mapInboxItemRecord(itemRow);
}

export async function getInboxItemDetailForUserQuery(
  userId: string,
  itemId: string
) {
  const item = await getInboxItemForUserQuery(userId, itemId);
  if (!item) {
    return null;
  }

  return getInboxItemDetailQuery(itemId);
}

export async function getInboxClarificationRequestForUserQuery(
  userId: string,
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

  if (!itemRow || itemRow.userId !== userId) {
    return null;
  }

  const request: InboxOwnedClarificationRequestRecord = {
    id: requestRow.id,
    itemId: requestRow.itemId,
    userId: itemRow.userId,
    question: requestRow.question,
    reason: requestRow.reason,
    status: requestRow.status,
    answeredAt: requestRow.answeredAt,
  };

  return request;
}

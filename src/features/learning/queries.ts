import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import {
  mapSourceFragmentRecord,
  mapSuggestionBatchRecord,
  mapSuggestionRecord,
  mapSuggestionResolutionRecord,
} from "@/features/learning/mappers";
import type {
  CanonicalMutationProvenanceDetail,
  SuggestionFeedRecord,
  SuggestionWithResolution,
} from "@/features/learning/types";
import { db } from "@/shared/db/client";
import {
  inboxClarificationAnswers,
  inboxFragments,
  inboxItems,
  learningCanonicalMutationEvidence,
  learningCanonicalMutationProvenance,
  learningSourceFragments,
  learningSuggestionBatches,
  learningSuggestionResolutions,
  learningSuggestions,
} from "@/shared/db/schema";

export async function listSourceFragmentsForMap(
  workspaceId: string,
  mapId: string,
  limit = 20
) {
  const rows = await db
    .select()
    .from(learningSourceFragments)
    .where(
      and(
        eq(learningSourceFragments.workspaceId, workspaceId),
        eq(learningSourceFragments.mapId, mapId)
      )
    )
    .orderBy(desc(learningSourceFragments.createdAt))
    .limit(limit);

  return rows.map(mapSourceFragmentRecord);
}

export async function listSuggestionBatchesForMap(
  workspaceId: string,
  mapId: string,
  limit = 20
) {
  const rows = await db
    .select()
    .from(learningSuggestionBatches)
    .where(
      and(
        eq(learningSuggestionBatches.workspaceId, workspaceId),
        eq(learningSuggestionBatches.mapId, mapId)
      )
    )
    .orderBy(desc(learningSuggestionBatches.startedAt))
    .limit(limit);

  return rows.map(mapSuggestionBatchRecord);
}

export async function listSuggestionsByBatch(workspaceId: string, batchId: string) {
  const rows = await db
    .select()
    .from(learningSuggestions)
    .where(
      and(
        eq(learningSuggestions.workspaceId, workspaceId),
        eq(learningSuggestions.batchId, batchId)
      )
    )
    .orderBy(
      asc(learningSuggestions.artifactOrder),
      asc(learningSuggestions.createdAt)
    );

  return rows.map(mapSuggestionRecord);
}

export async function getSuggestionWithResolution(
  workspaceId: string,
  suggestionId: string
): Promise<SuggestionWithResolution | null> {
  const [row] = await db
    .select({
      suggestion: learningSuggestions,
      resolution: learningSuggestionResolutions,
    })
    .from(learningSuggestions)
    .leftJoin(
      learningSuggestionResolutions,
      eq(learningSuggestions.id, learningSuggestionResolutions.suggestionId)
    )
    .where(
      and(
        eq(learningSuggestions.workspaceId, workspaceId),
        eq(learningSuggestions.id, suggestionId)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    suggestion: mapSuggestionRecord(row.suggestion),
    resolution: row.resolution
      ? mapSuggestionResolutionRecord(row.resolution)
      : null,
  };
}

export async function listSuggestionFeedForMap(
  workspaceId: string,
  mapId: string,
  limit = 100
): Promise<SuggestionFeedRecord[]> {
  const rows = await db
    .select({
      batch: learningSuggestionBatches,
      suggestion: learningSuggestions,
      resolution: learningSuggestionResolutions,
      sourceFragment: learningSourceFragments,
    })
    .from(learningSuggestions)
    .innerJoin(
      learningSuggestionBatches,
      eq(learningSuggestions.batchId, learningSuggestionBatches.id)
    )
    .leftJoin(
      learningSuggestionResolutions,
      eq(learningSuggestions.id, learningSuggestionResolutions.suggestionId)
    )
    .leftJoin(
      learningSourceFragments,
      eq(learningSuggestions.sourceFragmentId, learningSourceFragments.id)
    )
    .where(
      and(
        eq(learningSuggestions.workspaceId, workspaceId),
        eq(learningSuggestions.mapId, mapId)
      )
    )
    .orderBy(
      desc(learningSuggestionBatches.startedAt),
      asc(learningSuggestions.artifactOrder),
      asc(learningSuggestions.createdAt)
    )
    .limit(limit);

  return rows.map((row) => ({
    batch: mapSuggestionBatchRecord(row.batch),
    suggestion: mapSuggestionRecord(row.suggestion),
    resolution: row.resolution
      ? mapSuggestionResolutionRecord(row.resolution)
      : null,
    sourceFragment: row.sourceFragment
      ? mapSourceFragmentRecord(row.sourceFragment)
      : null,
  }));
}

export async function getLatestCanonicalMutationProvenanceForEntity(
  workspaceId: string,
  mapId: string,
  entityType: "concept" | "link" | "scenario",
  entityId: string
): Promise<CanonicalMutationProvenanceDetail | null> {
  const [row] = await db
    .select({
      provenance: learningCanonicalMutationProvenance,
      suggestion: learningSuggestions,
      resolution: learningSuggestionResolutions,
      inboxItem: {
        id: inboxItems.id,
        rawText: inboxItems.rawText,
        status: inboxItems.status,
        createdAt: inboxItems.createdAt,
      },
    })
    .from(learningCanonicalMutationProvenance)
    .innerJoin(
      learningSuggestions,
      eq(
        learningCanonicalMutationProvenance.originSuggestionId,
        learningSuggestions.id
      )
    )
    .innerJoin(
      learningSuggestionResolutions,
      eq(
        learningCanonicalMutationProvenance.reviewResolutionId,
        learningSuggestionResolutions.id
      )
    )
    .innerJoin(
      inboxItems,
      eq(learningCanonicalMutationProvenance.inboxItemId, inboxItems.id)
    )
    .where(
      and(
        eq(learningCanonicalMutationProvenance.workspaceId, workspaceId),
        eq(learningCanonicalMutationProvenance.mapId, mapId),
        eq(learningCanonicalMutationProvenance.entityType, entityType),
        eq(learningCanonicalMutationProvenance.entityId, entityId)
      )
    )
    .orderBy(desc(learningCanonicalMutationProvenance.createdAt))
    .limit(1);

  if (!row) {
    return null;
  }

  const evidenceRows = await db
    .select({
      evidence: learningCanonicalMutationEvidence,
      fragment: {
        id: inboxFragments.id,
        fragmentText: inboxFragments.fragmentText,
        sourceKind: inboxFragments.sourceKind,
      },
      clarificationAnswer: {
        id: inboxClarificationAnswers.id,
        answerText: inboxClarificationAnswers.answerText,
      },
    })
    .from(learningCanonicalMutationEvidence)
    .innerJoin(
      inboxFragments,
      eq(learningCanonicalMutationEvidence.inboxFragmentId, inboxFragments.id)
    )
    .leftJoin(
      inboxClarificationAnswers,
      eq(
        learningCanonicalMutationEvidence.clarificationAnswerId,
        inboxClarificationAnswers.id
      )
    )
    .where(eq(learningCanonicalMutationEvidence.provenanceId, row.provenance.id))
    .orderBy(
      asc(learningCanonicalMutationEvidence.evidenceOrder),
      asc(learningCanonicalMutationEvidence.fragmentOrdinal)
    );

  return {
    id: row.provenance.id,
    mapVersionId: row.provenance.mapVersionId,
    entityType: row.provenance.entityType,
    entityId: row.provenance.entityId,
    mutationType: row.provenance.mutationType,
    createdAt: row.provenance.createdAt,
    suggestion: mapSuggestionRecord(row.suggestion),
    resolution: mapSuggestionResolutionRecord(row.resolution),
    inboxItem: row.inboxItem,
    evidence: evidenceRows.map((evidenceRow) => ({
      id: evidenceRow.evidence.id,
      inboxFragmentId: evidenceRow.evidence.inboxFragmentId,
      clarificationAnswerId: evidenceRow.evidence.clarificationAnswerId,
      evidenceOrder: evidenceRow.evidence.evidenceOrder,
      fragmentOrdinal: evidenceRow.evidence.fragmentOrdinal,
      fragmentText: evidenceRow.fragment.fragmentText,
      sourceKind: evidenceRow.fragment.sourceKind,
      clarificationAnswerText: evidenceRow.clarificationAnswer?.answerText ?? null,
    })),
  };
}

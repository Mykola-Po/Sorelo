import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import {
  mapSourceFragmentRecord,
  mapSuggestionBatchRecord,
  mapSuggestionRecord,
  mapSuggestionResolutionRecord,
} from "@/features/learning/mappers";
import type { SuggestionFeedRecord, SuggestionWithResolution } from "@/features/learning/types";
import { db } from "@/shared/db/client";
import {
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
    .orderBy(asc(learningSuggestions.createdAt));

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
      suggestion: learningSuggestions,
      resolution: learningSuggestionResolutions,
      sourceFragment: learningSourceFragments,
    })
    .from(learningSuggestions)
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
    .orderBy(desc(learningSuggestions.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    suggestion: mapSuggestionRecord(row.suggestion),
    resolution: row.resolution
      ? mapSuggestionResolutionRecord(row.resolution)
      : null,
    sourceFragment: row.sourceFragment
      ? mapSourceFragmentRecord(row.sourceFragment)
      : null,
  }));
}

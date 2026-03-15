import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  attachSuggestionOriginInputSchema,
  sourceFragmentInputSchema,
  suggestionBatchInputSchema,
  suggestionInputSchema,
  suggestionResolutionInputSchema,
  type AttachSuggestionOriginInput,
  type SourceFragmentInput,
  type SuggestionBatchInput,
  type SuggestionInput,
  type SuggestionResolutionInput,
} from "@/features/learning/schemas";
import {
  mapSourceFragmentRecord,
  mapSuggestionBatchRecord,
  mapSuggestionRecord,
  mapSuggestionResolutionRecord,
} from "@/features/learning/mappers";
import { db } from "@/shared/db/client";
import {
  concepts,
  learningSourceFragments,
  learningSuggestionBatches,
  learningSuggestionResolutions,
  learningSuggestions,
  links,
  maps,
  scenarios,
  workspaces,
} from "@/shared/db/schema";

async function requireActiveWorkspace(workspaceId: string) {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), isNull(workspaces.archivedAt)))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return workspace;
}

async function assertMapIdsBelongToWorkspace(
  workspaceId: string,
  mapIds: string[]
) {
  if (mapIds.length === 0) {
    return;
  }

  const uniqueMapIds = [...new Set(mapIds)];
  const rows = await db
    .select({ id: maps.id })
    .from(maps)
    .where(
      and(
        eq(maps.workspaceId, workspaceId),
        isNull(maps.archivedAt),
        inArray(maps.id, uniqueMapIds)
      )
    );

  if (rows.length !== uniqueMapIds.length) {
    throw new Error("One or more maps do not belong to the target workspace.");
  }
}

async function getSuggestionRow(suggestionId: string, workspaceId: string) {
  const [suggestion] = await db
    .select()
    .from(learningSuggestions)
    .where(
      and(
        eq(learningSuggestions.id, suggestionId),
        eq(learningSuggestions.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!suggestion) {
    throw new Error("Suggestion not found.");
  }

  return suggestion;
}

export async function createSourceFragmentCommand(input: SourceFragmentInput) {
  const parsed = sourceFragmentInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  const [fragment] = await db
    .insert(learningSourceFragments)
    .values({
      workspaceId: parsed.workspaceId,
      mapId: parsed.mapId ?? null,
      authorUserId: parsed.authorUserId ?? null,
      sourceType: parsed.sourceType,
      rawText: parsed.rawText,
      normalizedText: parsed.normalizedText?.trim() || parsed.rawText.trim(),
      metadata: parsed.metadata ?? {},
    })
    .returning();

  if (!fragment) {
    throw new Error("Source fragment creation failed.");
  }

  return mapSourceFragmentRecord(fragment);
}

export async function createSuggestionBatchCommand(input: SuggestionBatchInput) {
  const parsed = suggestionBatchInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  const [batch] = await db
    .insert(learningSuggestionBatches)
    .values({
      workspaceId: parsed.workspaceId,
      mapId: parsed.mapId ?? null,
      initiatedByUserId: parsed.initiatedByUserId ?? null,
      batchType: parsed.batchType,
      modelName: parsed.modelName,
      modelVersion: parsed.modelVersion,
      promptVersion: parsed.promptVersion,
      inputHash: parsed.inputHash,
      status: parsed.status ?? "pending",
      startedAt: parsed.startedAt ?? new Date(),
      finishedAt: parsed.finishedAt ?? null,
      metadata: parsed.metadata ?? {},
    })
    .returning();

  if (!batch) {
    throw new Error("Suggestion batch creation failed.");
  }

  return mapSuggestionBatchRecord(batch);
}

export async function createSuggestionsCommand(input: SuggestionInput[]) {
  if (input.length === 0) {
    throw new Error("At least one suggestion is required.");
  }

  const parsedSuggestions = input.map((item) => suggestionInputSchema.parse(item));
  const workspaceIds = [...new Set(parsedSuggestions.map((item) => item.workspaceId))];
  if (workspaceIds.length !== 1) {
    throw new Error("Suggestions in a single request must share one workspace.");
  }

  const workspaceId = workspaceIds[0];
  if (!workspaceId) {
    throw new Error("Workspace is required for suggestions.");
  }

  const explicitMapIds = [
    ...new Set(
      parsedSuggestions
        .map((item) => item.mapId)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  await requireActiveWorkspace(workspaceId);

  if (explicitMapIds.length > 0) {
    await assertMapIdsBelongToWorkspace(workspaceId, explicitMapIds);
  }

  const batchIds = [...new Set(parsedSuggestions.map((item) => item.batchId))];

  const rows = await db.transaction(async (tx) => {
    const batches = await tx
      .select()
      .from(learningSuggestionBatches)
      .where(inArray(learningSuggestionBatches.id, batchIds));

    if (batches.length !== batchIds.length) {
      throw new Error("One or more suggestion batches could not be found.");
    }

    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const sourceFragmentIds = [
      ...new Set(
        parsedSuggestions
          .map((item) => item.sourceFragmentId)
          .filter((value): value is string => Boolean(value))
      ),
    ];

    const sourceFragments =
      sourceFragmentIds.length === 0
        ? []
        : await tx
            .select()
            .from(learningSourceFragments)
            .where(inArray(learningSourceFragments.id, sourceFragmentIds));

    const sourceFragmentById = new Map(
      sourceFragments.map((fragment) => [fragment.id, fragment])
    );

    const suggestionsToInsert = parsedSuggestions.map((rawInput) => {
      const item = rawInput as SuggestionInput;
      const batch = batchById.get(item.batchId);
      if (!batch) {
        throw new Error("Suggestion batch lookup failed.");
      }

      if (batch.workspaceId !== item.workspaceId) {
        throw new Error("Suggestion workspace does not match its batch.");
      }

      const sourceFragment = item.sourceFragmentId
        ? sourceFragmentById.get(item.sourceFragmentId)
        : null;

      if (item.sourceFragmentId && !sourceFragment) {
        throw new Error("Source fragment not found for suggestion.");
      }

      if (sourceFragment && sourceFragment.workspaceId !== item.workspaceId) {
        throw new Error("Source fragment workspace does not match suggestion.");
      }

      const effectiveMapId =
        item.mapId ?? batch.mapId ?? sourceFragment?.mapId ?? null;

      if (batch.mapId && effectiveMapId && batch.mapId !== effectiveMapId) {
        throw new Error("Suggestion map does not match its batch.");
      }

      if (
        sourceFragment?.mapId &&
        effectiveMapId &&
        sourceFragment.mapId !== effectiveMapId
      ) {
        throw new Error("Source fragment map does not match suggestion.");
      }

      return {
        batchId: item.batchId,
        workspaceId: item.workspaceId,
        mapId: effectiveMapId,
        sourceFragmentId: item.sourceFragmentId ?? null,
        suggestionType: item.suggestionType,
        targetEntityType: item.targetEntityType,
        targetEntityId: item.targetEntityId ?? null,
        proposedPayload: item.proposedPayload ?? {},
        rationale: item.rationale ?? null,
        confidence: item.confidence ?? null,
      };
    });

    return tx.insert(learningSuggestions).values(suggestionsToInsert).returning();
  });

  return rows.map(mapSuggestionRecord);
}

export async function resolveSuggestionCommand(input: SuggestionResolutionInput) {
  const parsed = suggestionResolutionInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  const suggestion = await getSuggestionRow(parsed.suggestionId, parsed.workspaceId);
  if (parsed.mapId && suggestion.mapId && suggestion.mapId !== parsed.mapId) {
    throw new Error("Resolution map does not match suggestion map.");
  }

  const [existingResolution] = await db
    .select({ id: learningSuggestionResolutions.id })
    .from(learningSuggestionResolutions)
    .where(eq(learningSuggestionResolutions.suggestionId, parsed.suggestionId))
    .limit(1);

  if (existingResolution) {
    throw new Error("Suggestion already has a terminal resolution.");
  }

  const [resolution] = await db
    .insert(learningSuggestionResolutions)
    .values({
      suggestionId: parsed.suggestionId,
      workspaceId: parsed.workspaceId,
      mapId: parsed.mapId ?? suggestion.mapId ?? null,
      actorUserId: parsed.actorUserId,
      resolutionType: parsed.resolutionType,
      beforePayload: parsed.beforePayload ?? {},
      afterPayload: parsed.afterPayload ?? {},
      reasonText: parsed.reasonText ?? null,
      latencyMs: parsed.latencyMs ?? null,
      resolvedAt: parsed.resolvedAt ?? new Date(),
    })
    .returning();

  if (!resolution) {
    throw new Error("Suggestion resolution failed.");
  }

  return mapSuggestionResolutionRecord(resolution);
}

export async function attachSuggestionOriginToEntityCommand(
  input: AttachSuggestionOriginInput
) {
  const parsed = attachSuggestionOriginInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  if (parsed.originSuggestionId) {
    const suggestion = await getSuggestionRow(
      parsed.originSuggestionId,
      parsed.workspaceId
    );

    if (parsed.mapId && suggestion.mapId && suggestion.mapId !== parsed.mapId) {
      throw new Error("Origin suggestion map does not match target map.");
    }
  }

  const originUpdate = {
    originType: parsed.originType,
    originSuggestionId: parsed.originSuggestionId ?? null,
  };

  let updatedId: string | null = null;

  switch (parsed.entityType) {
    case "concept": {
      const [concept] = await db
        .update(concepts)
        .set(originUpdate)
        .where(
          and(
            eq(concepts.id, parsed.entityId),
            eq(concepts.workspaceId, parsed.workspaceId),
            ...(parsed.mapId ? [eq(concepts.mapId, parsed.mapId)] : [])
          )
        )
        .returning({ id: concepts.id });
      updatedId = concept?.id ?? null;
      break;
    }
    case "link": {
      const [link] = await db
        .update(links)
        .set(originUpdate)
        .where(
          and(
            eq(links.id, parsed.entityId),
            eq(links.workspaceId, parsed.workspaceId),
            ...(parsed.mapId ? [eq(links.mapId, parsed.mapId)] : [])
          )
        )
        .returning({ id: links.id });
      updatedId = link?.id ?? null;
      break;
    }
    case "scenario": {
      const [scenario] = await db
        .update(scenarios)
        .set(originUpdate)
        .where(
          and(
            eq(scenarios.id, parsed.entityId),
            eq(scenarios.workspaceId, parsed.workspaceId),
            ...(parsed.mapId ? [eq(scenarios.mapId, parsed.mapId)] : [])
          )
        )
        .returning({ id: scenarios.id });
      updatedId = scenario?.id ?? null;
      break;
    }
  }

  if (!updatedId) {
    throw new Error("Canonical entity not found for origin attachment.");
  }

  return {
    entityType: parsed.entityType,
    entityId: updatedId,
    originType: parsed.originType,
    originSuggestionId: parsed.originSuggestionId ?? null,
  };
}

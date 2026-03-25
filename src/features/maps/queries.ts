import "server-only";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
} from "drizzle-orm";

import {
  listScenarioRunsForMap,
  listScenarioRunsForWorkspace,
} from "@/features/scenarios/queries";
import {
  getLatestCanonicalMutationProvenanceForEntity,
  listSuggestionFeedForMap,
} from "@/features/learning/queries";
import { db } from "@/shared/db/client";
import {
  concepts,
  links,
  maps,
  scenarioRuns,
  scenarios,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";
import type { InspectorSelection } from "@/features/inspector/types";

function normalizeLearningBatchType(batchType: string) {
  return batchType === "promote_apply" ? "inbox_review" : batchType;
}

function serializeInspectorProvenance(
  provenance: Awaited<
    ReturnType<typeof getLatestCanonicalMutationProvenanceForEntity>
  >
) {
  if (!provenance) {
    return null;
  }

  return {
    id: provenance.id,
    mapVersionId: provenance.mapVersionId,
    mutationType: provenance.mutationType,
    createdAt: provenance.createdAt.toISOString(),
    suggestion: {
      id: provenance.suggestion.id,
      suggestionType: provenance.suggestion.suggestionType,
      rationale: provenance.suggestion.rationale,
      confidence: provenance.suggestion.confidence,
      artifactOrder: provenance.suggestion.artifactOrder,
    },
    resolution: {
      id: provenance.resolution.id,
      resolutionType: provenance.resolution.resolutionType,
      applyStatus: provenance.resolution.applyStatus,
      reasonText: provenance.resolution.reasonText,
      resolvedAt: provenance.resolution.resolvedAt.toISOString(),
      appliedAt: provenance.resolution.appliedAt?.toISOString() ?? null,
    },
    inboxItem: {
      id: provenance.inboxItem.id,
      rawText: provenance.inboxItem.rawText,
      status: provenance.inboxItem.status,
      createdAt: provenance.inboxItem.createdAt.toISOString(),
    },
    evidence: provenance.evidence.map((evidence) => ({
      id: evidence.id,
      inboxFragmentId: evidence.inboxFragmentId,
      clarificationAnswerId: evidence.clarificationAnswerId,
      evidenceOrder: evidence.evidenceOrder,
      fragmentOrdinal: evidence.fragmentOrdinal,
      fragmentText: evidence.fragmentText,
      sourceKind: evidence.sourceKind,
      clarificationAnswerText: evidence.clarificationAnswerText,
    })),
  };
}

export async function listMapsForWorkspace(workspaceId: string) {
  return db
    .select({
      id: maps.id,
      title: maps.title,
      slug: maps.slug,
      subjectLabel: maps.subjectLabel,
      description: maps.description,
      updatedAt: maps.updatedAt,
    })
    .from(maps)
    .where(and(eq(maps.workspaceId, workspaceId), isNull(maps.archivedAt)))
    .orderBy(desc(maps.updatedAt), maps.title);
}

export async function listMapsForUser(userId: string, workspaceSlug: string) {
  return db
    .select({
      id: maps.id,
      title: maps.title,
      slug: maps.slug,
      subjectLabel: maps.subjectLabel,
      workspaceSlug: workspaces.slug,
    })
    .from(maps)
    .innerJoin(workspaces, eq(maps.workspaceId, workspaces.id))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, userId)
      )
    )
    .where(and(eq(workspaces.slug, workspaceSlug), isNull(maps.archivedAt)))
    .orderBy(desc(maps.updatedAt), maps.title);
}

export async function getMapsHomeData(workspaceId: string) {
  const [mapsList, recentRuns] = await Promise.all([
    listMapsForWorkspace(workspaceId),
    listScenarioRunsForWorkspace(workspaceId, 6),
  ]);

  const latestMapId = mapsList[0]?.id ?? null;
  const [
    memberCountRow,
    conceptCountRow,
    linkCountRow,
    scenarioRunCountRow,
    latestMapConceptCountRow,
    latestMapLinkCountRow,
    latestMapScenarioRunCountRow,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
    db
      .select({ value: count() })
      .from(concepts)
      .where(
        and(
          eq(concepts.workspaceId, workspaceId),
          isNull(concepts.archivedAt)
        )
      ),
    db
      .select({ value: count() })
      .from(links)
      .where(eq(links.workspaceId, workspaceId)),
    db
      .select({ value: count() })
      .from(scenarioRuns)
      .where(eq(scenarioRuns.workspaceId, workspaceId)),
    latestMapId
      ? db
          .select({ value: count() })
          .from(concepts)
          .where(
            and(
              eq(concepts.workspaceId, workspaceId),
              eq(concepts.mapId, latestMapId),
              isNull(concepts.archivedAt)
            )
          )
      : Promise.resolve([]),
    latestMapId
      ? db
          .select({ value: count() })
          .from(links)
          .where(
            and(eq(links.workspaceId, workspaceId), eq(links.mapId, latestMapId))
          )
      : Promise.resolve([]),
    latestMapId
      ? db
          .select({ value: count() })
          .from(scenarioRuns)
          .where(
            and(
              eq(scenarioRuns.workspaceId, workspaceId),
              eq(scenarioRuns.mapId, latestMapId)
            )
          )
      : Promise.resolve([]),
  ]);

  return {
    maps: mapsList,
    recentRuns,
    summary: {
      mapCount: mapsList.length,
      memberCount: Number(memberCountRow[0]?.value ?? 0),
      conceptCount: Number(conceptCountRow[0]?.value ?? 0),
      linkCount: Number(linkCountRow[0]?.value ?? 0),
      scenarioRunCount: Number(scenarioRunCountRow[0]?.value ?? 0),
      latestMapMetrics: latestMapId
        ? {
            conceptCount: Number(latestMapConceptCountRow[0]?.value ?? 0),
            linkCount: Number(latestMapLinkCountRow[0]?.value ?? 0),
            scenarioRunCount: Number(
              latestMapScenarioRunCountRow[0]?.value ?? 0
            ),
          }
        : null,
    },
  };
}

export async function getMapWorkspace(mapId: string, workspaceId: string) {
  const rows = await db
    .select({
      id: maps.id,
      title: maps.title,
      slug: maps.slug,
      subjectLabel: maps.subjectLabel,
      description: maps.description,
      graphRevision: maps.graphRevision,
      updatedAt: maps.updatedAt,
      workspace: {
        id: workspaces.id,
        slug: workspaces.slug,
        name: workspaces.name,
      },
    })
    .from(maps)
    .innerJoin(workspaces, eq(maps.workspaceId, workspaces.id))
    .where(
      and(
        eq(maps.id, mapId),
        eq(maps.workspaceId, workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getMapGraphMetrics(mapId: string, workspaceId: string) {
  const [conceptCountRow, linkCountRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(concepts)
      .where(
        and(
          eq(concepts.mapId, mapId),
          eq(concepts.workspaceId, workspaceId),
          isNull(concepts.archivedAt)
        )
      ),
    db
      .select({ value: count() })
      .from(links)
      .where(and(eq(links.mapId, mapId), eq(links.workspaceId, workspaceId))),
  ]);

  const map = await getMapWorkspace(mapId, workspaceId);

  if (!map) {
    return null;
  }

  return {
    revision: map.graphRevision,
    conceptCount: Number(conceptCountRow[0]?.value ?? 0),
    linkCount: Number(linkCountRow[0]?.value ?? 0),
  };
}

async function listFullGraphRecords(mapId: string, workspaceId: string) {
  const [graphConcepts, graphLinks] = await Promise.all([
    db
      .select({
        id: concepts.id,
        title: concepts.title,
        conceptType: concepts.conceptType,
        summary: concepts.summary,
        description: concepts.description,
        x: concepts.x,
        y: concepts.y,
        updatedAt: concepts.updatedAt,
      })
      .from(concepts)
      .where(
        and(
          eq(concepts.mapId, mapId),
          eq(concepts.workspaceId, workspaceId),
          isNull(concepts.archivedAt)
        )
      )
      .orderBy(desc(concepts.updatedAt), concepts.title),
    db
      .select({
        id: links.id,
        sourceConceptId: links.sourceConceptId,
        targetConceptId: links.targetConceptId,
        relationType: links.relationType,
        strength: links.strength,
        description: links.description,
        updatedAt: links.updatedAt,
      })
      .from(links)
      .where(and(eq(links.mapId, mapId), eq(links.workspaceId, workspaceId)))
      .orderBy(desc(links.updatedAt)),
  ]);

  return {
    concepts: graphConcepts,
    links: graphLinks,
  };
}

function serializeFullGraphSnapshot(
  revision: number,
  graphRecords: Awaited<ReturnType<typeof listFullGraphRecords>>
) {
  return {
    revision,
    counts: {
      conceptCount: graphRecords.concepts.length,
      linkCount: graphRecords.links.length,
    },
    concepts: graphRecords.concepts.map((concept) => ({
      ...concept,
      updatedAt: concept.updatedAt.toISOString(),
    })),
    links: graphRecords.links.map((link) => ({
      ...link,
      updatedAt: link.updatedAt.toISOString(),
    })),
  };
}

export async function getMapRevision(mapId: string, workspaceId: string) {
  const rows = await db
    .select({
      revision: maps.graphRevision,
    })
    .from(maps)
    .where(
      and(
        eq(maps.id, mapId),
        eq(maps.workspaceId, workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .limit(1);

  return rows[0]?.revision ?? null;
}

async function listScenarioSummariesForMap(mapId: string, workspaceId: string) {
  const rows = await db
    .select({
      id: scenarios.id,
      title: scenarios.title,
      situation: scenarios.situation,
      seedConceptIds: scenarios.seedConceptIds,
      updatedAt: scenarios.updatedAt,
    })
    .from(scenarios)
    .where(
      and(eq(scenarios.mapId, mapId), eq(scenarios.workspaceId, workspaceId))
    )
    .orderBy(desc(scenarios.updatedAt));

  const uniqueSeedIds = Array.from(
    new Set(rows.flatMap((scenario) => scenario.seedConceptIds))
  );

  const seedConceptRows =
    uniqueSeedIds.length > 0
      ? await db
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
              inArray(concepts.id, uniqueSeedIds)
            )
          )
      : [];

  const seedTitleById = new Map(
    seedConceptRows.map((concept) => [concept.id, concept.title])
  );

  return rows.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    situation: scenario.situation,
    updatedAt: scenario.updatedAt.toISOString(),
    seedConcepts: scenario.seedConceptIds
      .map((seedId) => ({
        id: seedId,
        title: seedTitleById.get(seedId),
      }))
      .filter(
        (
          seed
        ): seed is {
          id: string;
          title: string;
        } => Boolean(seed.title)
      ),
  }));
}

export async function getMapWorkspaceChromeData(
  mapId: string,
  workspaceId: string,
  currentUserId?: string
) {
  const map = await getMapWorkspace(mapId, workspaceId);

  if (!map) {
    return null;
  }

  const [availableMaps, graphRecords, mapScenarios, mapRuns, learningFeed] =
    await Promise.all([
      listMapsForWorkspace(workspaceId),
      listFullGraphRecords(mapId, workspaceId),
      listScenarioSummariesForMap(mapId, workspaceId),
      listScenarioRunsForMap(mapId, workspaceId, {
        limit: 8,
        ...(currentUserId ? { reviewerUserId: currentUserId } : {}),
      }),
      listSuggestionFeedForMap(workspaceId, mapId, 80),
    ]);

  const initialSnapshot = serializeFullGraphSnapshot(
    map.graphRevision,
    graphRecords
  );

  return {
    map,
    availableMaps,
    graphMetrics: {
      revision: initialSnapshot.revision,
      conceptCount: initialSnapshot.counts.conceptCount,
      linkCount: initialSnapshot.counts.linkCount,
    },
    initialSnapshot,
    scenarios: mapScenarios,
    runs: mapRuns,
    learningSuggestions: learningFeed.map((item) => ({
      id: item.suggestion.id,
      batchId: item.batch.id,
      batchType: normalizeLearningBatchType(item.batch.batchType),
      batchStatus: item.batch.status,
      batchMetadata: item.batch.metadata,
      inboxItemId: item.suggestion.inboxItemId,
      inboxPacketId: item.suggestion.inboxPacketId,
      suggestionType: item.suggestion.suggestionType,
      targetEntityType: item.suggestion.targetEntityType,
      proposedPayload: item.suggestion.proposedPayload,
      artifactOrder: item.suggestion.artifactOrder,
      rationale: item.suggestion.rationale,
      confidence: item.suggestion.confidence,
      createdAt: item.suggestion.createdAt.toISOString(),
      sourceType: item.sourceFragment?.sourceType ?? null,
      sourceRawText: item.sourceFragment?.rawText ?? null,
      resolution: item.resolution
        ? {
            id: item.resolution.id,
            resolutionType: item.resolution.resolutionType,
            applyStatus: item.resolution.applyStatus,
            appliedAt: item.resolution.appliedAt
              ? item.resolution.appliedAt.toISOString()
              : null,
            applyOutcome: item.resolution.applyOutcome,
            applyError: item.resolution.applyError,
            reasonText: item.resolution.reasonText,
            resolvedAt: item.resolution.resolvedAt.toISOString(),
          }
        : null,
    })),
  };
}

export async function getFullGraphSnapshot(mapId: string, workspaceId: string) {
  const map = await getMapWorkspace(mapId, workspaceId);

  if (!map) {
    return null;
  }

  const graphRecords = await listFullGraphRecords(mapId, workspaceId);
  return serializeFullGraphSnapshot(map.graphRevision, graphRecords);
}

export async function listConceptCatalogForMap(
  mapId: string,
  workspaceId: string,
  options?: {
    query?: string;
  }
) {
  const query = options?.query?.trim();
  const filters = [
    eq(concepts.mapId, mapId),
    eq(concepts.workspaceId, workspaceId),
    isNull(concepts.archivedAt),
  ];

  if (query) {
    filters.push(ilike(concepts.title, `%${query}%`));
  }

  return db
    .select({
      id: concepts.id,
      title: concepts.title,
    })
    .from(concepts)
    .where(and(...filters))
    .orderBy(desc(concepts.updatedAt), concepts.title);
}

export async function getInspectorPayload(
  mapId: string,
  workspaceId: string,
  selection: InspectorSelection
) {
  if (selection.kind === "concept") {
    const [concept, provenance] = await Promise.all([
      db
        .select({
          id: concepts.id,
          title: concepts.title,
          conceptType: concepts.conceptType,
          summary: concepts.summary,
          description: concepts.description,
          x: concepts.x,
          y: concepts.y,
        })
        .from(concepts)
        .where(
          and(
            eq(concepts.id, selection.id),
            eq(concepts.mapId, mapId),
            eq(concepts.workspaceId, workspaceId),
            isNull(concepts.archivedAt)
          )
        )
        .limit(1)
        .then((rows) => rows[0]),
      getLatestCanonicalMutationProvenanceForEntity(
        workspaceId,
        mapId,
        "concept",
        selection.id
      ),
    ]);

    if (!concept) {
      return null;
    }

    const [incoming, outgoing] = await Promise.all([
      db
        .select({
          id: links.id,
          relationType: links.relationType,
          strength: links.strength,
          relatedConceptId: links.sourceConceptId,
        })
        .from(links)
        .where(
          and(
            eq(links.targetConceptId, concept.id),
            eq(links.mapId, mapId),
            eq(links.workspaceId, workspaceId)
          )
        ),
      db
        .select({
          id: links.id,
          relationType: links.relationType,
          strength: links.strength,
          relatedConceptId: links.targetConceptId,
        })
        .from(links)
        .where(
          and(
            eq(links.sourceConceptId, concept.id),
            eq(links.mapId, mapId),
            eq(links.workspaceId, workspaceId)
          )
        ),
    ]);

    const relatedIds = Array.from(
      new Set([...incoming, ...outgoing].map((link) => link.relatedConceptId))
    );

    const relatedConcepts =
      relatedIds.length > 0
        ? await db
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
                inArray(concepts.id, relatedIds)
              )
            )
        : [];

    const relatedTitleById = new Map(
      relatedConcepts.map((item) => [item.id, item.title])
    );

    return {
      kind: "concept" as const,
      concept,
      provenance: serializeInspectorProvenance(provenance),
      incoming: incoming.map((link) => ({
        id: link.id,
        relationType: link.relationType,
        strength: link.strength,
        relatedConceptId: link.relatedConceptId,
        relatedConceptTitle:
          relatedTitleById.get(link.relatedConceptId) ?? "Unknown concept",
      })),
      outgoing: outgoing.map((link) => ({
        id: link.id,
        relationType: link.relationType,
        strength: link.strength,
        relatedConceptId: link.relatedConceptId,
        relatedConceptTitle:
          relatedTitleById.get(link.relatedConceptId) ?? "Unknown concept",
      })),
    };
  }

  if (selection.kind === "link") {
    const [link, provenance] = await Promise.all([
      db
        .select({
          id: links.id,
          relationType: links.relationType,
          strength: links.strength,
          description: links.description,
          sourceConceptId: links.sourceConceptId,
          targetConceptId: links.targetConceptId,
        })
        .from(links)
        .where(
          and(
            eq(links.id, selection.id),
            eq(links.mapId, mapId),
            eq(links.workspaceId, workspaceId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]),
      getLatestCanonicalMutationProvenanceForEntity(
        workspaceId,
        mapId,
        "link",
        selection.id
      ),
    ]);

    if (!link) {
      return null;
    }

    return {
      kind: "link" as const,
      link,
      provenance: serializeInspectorProvenance(provenance),
    };
  }

  return null;
}

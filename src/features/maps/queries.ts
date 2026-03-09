import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { listScenarioRunsForMap, listScenarioRunsForWorkspace } from "@/features/scenarios/queries";
import { db } from "@/shared/db/client";
import {
  concepts,
  links,
  maps,
  scenarios,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";
import type { InspectorSelection } from "@/features/inspector/types";

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

  return {
    maps: mapsList,
    recentRuns,
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

export async function getMapWorkspaceDetail(mapId: string, workspaceId: string) {
  const map = await getMapWorkspace(mapId, workspaceId);

  if (!map) {
    return null;
  }

  const [availableMaps, mapConcepts, mapLinks, mapScenarios, mapRuns] =
    await Promise.all([
      listMapsForWorkspace(workspaceId),
      db
        .select({
          id: concepts.id,
          title: concepts.title,
          conceptType: concepts.conceptType,
          summary: concepts.summary,
          description: concepts.description,
          x: concepts.x,
          y: concepts.y,
          createdByUserId: concepts.createdByUserId,
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
      db
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
        .orderBy(desc(scenarios.updatedAt)),
      listScenarioRunsForMap(mapId, workspaceId, 8),
    ]);

  return {
    map,
    availableMaps,
    concepts: mapConcepts,
    links: mapLinks,
    scenarios: mapScenarios,
    runs: mapRuns,
  };
}

export async function getInspectorPayload(
  mapId: string,
  workspaceId: string,
  selection: InspectorSelection
) {
  if (selection.kind === "concept") {
    const [concept] = await db
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
      .limit(1);

    if (!concept) {
      return null;
    }

    const [incoming, outgoing] = await Promise.all([
      db
        .select({
          id: links.id,
          relationType: links.relationType,
          strength: links.strength,
          sourceConceptId: links.sourceConceptId,
        })
        .from(links)
        .where(
          and(eq(links.targetConceptId, concept.id), eq(links.mapId, mapId))
        ),
      db
        .select({
          id: links.id,
          relationType: links.relationType,
          strength: links.strength,
          targetConceptId: links.targetConceptId,
        })
        .from(links)
        .where(
          and(eq(links.sourceConceptId, concept.id), eq(links.mapId, mapId))
        ),
    ]);

    return {
      kind: "concept" as const,
      concept,
      incoming,
      outgoing,
    };
  }

  if (selection.kind === "link") {
    const rows = await db
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
        and(eq(links.id, selection.id), eq(links.mapId, mapId), eq(links.workspaceId, workspaceId))
      )
      .limit(1);

    const link = rows[0];
    if (!link) {
      return null;
    }

    return {
      kind: "link" as const,
      link,
    };
  }

  return null;
}

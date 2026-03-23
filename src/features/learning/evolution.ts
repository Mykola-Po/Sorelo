import "server-only";

import type { Database } from "@/shared/db/client";
import {
  learningEntityLineage,
  learningMapVersions,
  type ConceptType,
  type MapVersionTriggerType,
  type RelationType,
} from "@/shared/db/schema";

type EvolutionWriter = Pick<Database, "insert">;

export type ConceptLineageSnapshot = {
  title: string;
  conceptType: ConceptType;
  archivedAt: Date | null;
};

export function deriveConceptLineageTransitions(input: {
  before: ConceptLineageSnapshot;
  after: ConceptLineageSnapshot;
}) {
  const transitions: Array<"rename" | "retype" | "archive" | "restore"> = [];

  if (input.before.title !== input.after.title) {
    transitions.push("rename");
  }

  if (input.before.conceptType !== input.after.conceptType) {
    transitions.push("retype");
  }

  if (!input.before.archivedAt && input.after.archivedAt) {
    transitions.push("archive");
  }

  if (input.before.archivedAt && !input.after.archivedAt) {
    transitions.push("restore");
  }

  return transitions;
}

export function deriveLinkLineageTransitions(input: {
  beforeRelationType: RelationType;
  afterRelationType: RelationType;
}) {
  if (input.beforeRelationType === input.afterRelationType) {
    return [];
  }

  return ["retype"] as const;
}

export async function recordMapManualVersion(
  dbOrTx: EvolutionWriter,
  input: {
    workspaceId: string;
    mapId: string;
    versionNo: number;
    actorUserId: string;
    triggerType?: MapVersionTriggerType | undefined;
    causedByResolutionId?: string | null | undefined;
    snapshotJson?: Record<string, unknown>;
    diffJson?: Record<string, unknown>;
  }
) {
  await dbOrTx.insert(learningMapVersions).values({
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    versionNo: input.versionNo,
    triggerType: input.triggerType ?? "manual_edit",
    actorUserId: input.actorUserId,
    causedByResolutionId: input.causedByResolutionId ?? null,
    snapshotJson: input.snapshotJson ?? {},
    diffJson: input.diffJson ?? {},
  });
}

export async function recordEntityLineageTransition(
  dbOrTx: EvolutionWriter,
  input: {
    workspaceId: string;
    mapId: string;
    entityType: "concept" | "link" | "scenario";
    fromEntityId?: string | null;
    toEntityId?: string | null;
    transitionType:
      | "split"
      | "merge"
      | "rename"
      | "retype"
      | "archive"
      | "restore";
    causedByResolutionId?: string | null;
  }
) {
  await dbOrTx.insert(learningEntityLineage).values({
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    entityType: input.entityType,
    fromEntityId: input.fromEntityId ?? null,
    toEntityId: input.toEntityId ?? null,
    transitionType: input.transitionType,
    causedByResolutionId: input.causedByResolutionId ?? null,
  });
}

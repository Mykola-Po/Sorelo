import type { GraphSnapshot } from "@/features/map-runtime/types";

import type { MapGraphOperation } from "./contracts";
import {
  isConceptArchiveOperation,
  isConceptCreateOperation,
  isConceptPositionSetOperation,
  isLinkArchiveOperation,
  isLinkCreateOperation,
} from "./contracts";

function withDerivedCounts(
  snapshot: GraphSnapshot,
  overrides: Partial<GraphSnapshot>
): GraphSnapshot {
  const nextSnapshot = {
    ...snapshot,
    ...overrides,
  };

  return {
    ...nextSnapshot,
    counts: {
      conceptCount: nextSnapshot.concepts.length,
      linkCount: nextSnapshot.links.length,
    },
  };
}

export function applyGraphOperationToSnapshot(
  snapshot: GraphSnapshot,
  operation: MapGraphOperation
): GraphSnapshot | null {
  if (isConceptPositionSetOperation(operation)) {
    if (!snapshot.concepts.some((concept) => concept.id === operation.entityId)) {
      return null;
    }

    return withDerivedCounts(snapshot, {
      revision: operation.seq,
      concepts: snapshot.concepts.map((concept) =>
        concept.id === operation.entityId
          ? {
              ...concept,
              x: operation.payload.x,
              y: operation.payload.y,
            }
          : concept
      ),
    });
  }

  if (isConceptCreateOperation(operation)) {
    const nextConcept = operation.payload;
    const existingConceptIndex = snapshot.concepts.findIndex(
      (concept) => concept.id === operation.entityId
    );

    return withDerivedCounts(snapshot, {
      revision: operation.seq,
      concepts:
        existingConceptIndex === -1
          ? [...snapshot.concepts, nextConcept]
          : snapshot.concepts.map((concept) =>
              concept.id === operation.entityId ? nextConcept : concept
            ),
    });
  }

  if (isConceptArchiveOperation(operation)) {
    if (!snapshot.concepts.some((concept) => concept.id === operation.entityId)) {
      return null;
    }

    const archivedLinkIds = new Set(operation.payload.archivedLinkIds);
    return withDerivedCounts(snapshot, {
      revision: operation.seq,
      concepts: snapshot.concepts.filter(
        (concept) => concept.id !== operation.entityId
      ),
      links: snapshot.links.filter(
        (link) =>
          !archivedLinkIds.has(link.id) &&
          link.sourceConceptId !== operation.entityId &&
          link.targetConceptId !== operation.entityId
      ),
    });
  }

  if (isLinkCreateOperation(operation)) {
    const sourceExists = snapshot.concepts.some(
      (concept) => concept.id === operation.payload.sourceConceptId
    );
    const targetExists = snapshot.concepts.some(
      (concept) => concept.id === operation.payload.targetConceptId
    );

    if (!sourceExists || !targetExists) {
      return null;
    }

    const nextLink = operation.payload;
    const existingLinkIndex = snapshot.links.findIndex(
      (link) => link.id === operation.entityId
    );

    return withDerivedCounts(snapshot, {
      revision: operation.seq,
      links:
        existingLinkIndex === -1
          ? [...snapshot.links, nextLink]
          : snapshot.links.map((link) =>
              link.id === operation.entityId ? nextLink : link
            ),
    });
  }

  if (isLinkArchiveOperation(operation)) {
    if (!snapshot.links.some((link) => link.id === operation.entityId)) {
      return null;
    }

    return withDerivedCounts(snapshot, {
      revision: operation.seq,
      links: snapshot.links.filter((link) => link.id !== operation.entityId),
    });
  }

  return null;
}

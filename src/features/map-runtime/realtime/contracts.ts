import type {
  GraphConceptNode,
  GraphLinkEdge,
} from "@/features/map-runtime/types";

export const MAP_GRAPH_OP_KIND_CONCEPT_POSITION_SET =
  "concept.position.set" as const;
export const MAP_GRAPH_OP_KIND_CONCEPT_CREATE = "concept.create" as const;
export const MAP_GRAPH_OP_KIND_CONCEPT_ARCHIVE = "concept.archive" as const;
export const MAP_GRAPH_OP_KIND_LINK_CREATE = "link.create" as const;
export const MAP_GRAPH_OP_KIND_LINK_ARCHIVE = "link.archive" as const;

export type MapGraphOpKind =
  | typeof MAP_GRAPH_OP_KIND_CONCEPT_POSITION_SET
  | typeof MAP_GRAPH_OP_KIND_CONCEPT_CREATE
  | typeof MAP_GRAPH_OP_KIND_CONCEPT_ARCHIVE
  | typeof MAP_GRAPH_OP_KIND_LINK_CREATE
  | typeof MAP_GRAPH_OP_KIND_LINK_ARCHIVE;

export type MapGraphEntityType = "concept" | "link";

export type ConceptPositionSetPayload = {
  x: number;
  y: number;
};

export type ConceptCreatePayload = GraphConceptNode;

export type ConceptArchivePayload = {
  archivedAt: string;
  archivedLinkIds: string[];
};

export type LinkCreatePayload = GraphLinkEdge;

export type LinkArchivePayload = {
  sourceConceptId: string | null;
  targetConceptId: string | null;
  archivedAt: string;
};

type BaseGraphOperation<
  TKind extends MapGraphOpKind,
  TEntityType extends MapGraphEntityType,
  TPayload,
> = {
  id: string;
  workspaceId: string;
  mapId: string;
  seq: number;
  actorUserId: string;
  clientId: string;
  clientMutationId: string;
  opKind: TKind;
  entityType: TEntityType;
  entityId: string;
  payload: TPayload;
  createdAt: string;
};

export type ConceptPositionSetOperation = BaseGraphOperation<
  typeof MAP_GRAPH_OP_KIND_CONCEPT_POSITION_SET,
  "concept",
  ConceptPositionSetPayload
>;

export type ConceptCreateOperation = BaseGraphOperation<
  typeof MAP_GRAPH_OP_KIND_CONCEPT_CREATE,
  "concept",
  ConceptCreatePayload
>;

export type ConceptArchiveOperation = BaseGraphOperation<
  typeof MAP_GRAPH_OP_KIND_CONCEPT_ARCHIVE,
  "concept",
  ConceptArchivePayload
>;

export type LinkCreateOperation = BaseGraphOperation<
  typeof MAP_GRAPH_OP_KIND_LINK_CREATE,
  "link",
  LinkCreatePayload
>;

export type LinkArchiveOperation = BaseGraphOperation<
  typeof MAP_GRAPH_OP_KIND_LINK_ARCHIVE,
  "link",
  LinkArchivePayload
>;

export type MapGraphOperation =
  | ConceptPositionSetOperation
  | ConceptCreateOperation
  | ConceptArchiveOperation
  | LinkCreateOperation
  | LinkArchiveOperation;

export type GraphOpsCursor = {
  afterSeq: number;
  lastSeq: number;
  hasMore: boolean;
};

export type MapGraphOperationsResponse = {
  ok: true;
  revision: number;
  hasMore: boolean;
  ops: MapGraphOperation[];
  cursor?: GraphOpsCursor;
};

export type PositionedConcept = {
  id: string;
  x: number;
  y: number;
};

export type ConceptPositionMutationResult = {
  revision: number;
  seq: number;
  op: ConceptPositionSetOperation;
  concept: PositionedConcept;
  duplicate: boolean;
};

export type ConceptPositionMutationResponse = {
  ok: true;
  revision: number;
  seq: number;
  op: ConceptPositionSetOperation;
  concept: PositionedConcept;
  concepts?: PositionedConcept[];
  duplicate?: boolean;
};

export function isConceptPositionSetOperation(
  operation: MapGraphOperation
): operation is ConceptPositionSetOperation {
  return operation.opKind === MAP_GRAPH_OP_KIND_CONCEPT_POSITION_SET;
}

export function isConceptCreateOperation(
  operation: MapGraphOperation
): operation is ConceptCreateOperation {
  return operation.opKind === MAP_GRAPH_OP_KIND_CONCEPT_CREATE;
}

export function isConceptArchiveOperation(
  operation: MapGraphOperation
): operation is ConceptArchiveOperation {
  return operation.opKind === MAP_GRAPH_OP_KIND_CONCEPT_ARCHIVE;
}

export function isLinkCreateOperation(
  operation: MapGraphOperation
): operation is LinkCreateOperation {
  return operation.opKind === MAP_GRAPH_OP_KIND_LINK_CREATE;
}

export function isLinkArchiveOperation(
  operation: MapGraphOperation
): operation is LinkArchiveOperation {
  return operation.opKind === MAP_GRAPH_OP_KIND_LINK_ARCHIVE;
}

export function getPendingGraphOperationKey(
  clientId: string,
  clientMutationId: string
) {
  return `${clientId}:${clientMutationId}`;
}

export function createGraphClientMutationId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `mutation-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

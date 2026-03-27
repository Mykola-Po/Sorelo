"use client";

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type {
  DragState,
  PendingLocalGraphOperation,
} from "@/features/map-runtime/store/map-store";
import type {
  ConceptPositionMutationResponse,
} from "@/features/map-runtime/realtime/contracts";
import {
  createGraphClientMutationId,
  MAP_GRAPH_OP_KIND_CONCEPT_POSITION_SET,
  getPendingGraphOperationKey,
} from "@/features/map-runtime/realtime/contracts";
import type {
  PositionPersistenceEvent,
  PositionPersistenceState,
} from "@/features/map-runtime/renderers/concept-drag";

class GraphRevisionConflictError extends Error {
  readonly currentRevision: number | null;

  constructor(message: string, currentRevision: number | null) {
    super(message);
    this.name = "GraphRevisionConflictError";
    this.currentRevision = currentRevision;
  }
}

type UseGraphMutationQueueInput = {
  mapId: string;
  clientId: string;
  getExpectedRevision: () => number;
  dragStateRef: MutableRefObject<DragState>;
  dragSessionRef: MutableRefObject<object | null>;
  positionSaveFailedMessage: string;
  setDragState: (dragState: DragState) => void;
  resetDragState: () => void;
  addPendingLocalOp: (operation: PendingLocalGraphOperation) => void;
  clearPendingLocalOp: (key: string) => void;
  onConflict: () => void;
  onMutationCommitted: (result: ConceptPositionMutationResponse) => void;
  reducePositionPersistenceState: (
    state: PositionPersistenceState,
    action: Extract<
      PositionPersistenceEvent,
      { type: "saving" } | { type: "retry" } | { type: "error"; message: string }
    >
  ) => PositionPersistenceState;
  initialPersistenceState: PositionPersistenceState;
  retryDelayMs: number;
};

export function useGraphMutationQueue(input: UseGraphMutationQueueInput) {
  const positionRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const positionSaveRequestIdRef = useRef(0);
  const persistConceptPositionRef = useRef<
    | ((
        conceptId: string,
        x: number,
        y: number,
        options?: {
          requestId?: number;
          retryCount?: number;
          clientMutationId?: string;
        }
      ) => Promise<void>)
    | null
  >(null);

  const clearPositionRetryTimer = useCallback(() => {
    if (positionRetryTimerRef.current !== null) {
      clearTimeout(positionRetryTimerRef.current);
      positionRetryTimerRef.current = null;
    }
  }, []);

  const createPositionMutationRequestId = useCallback(() => {
    clearPositionRetryTimer();
    positionSaveRequestIdRef.current += 1;
    return positionSaveRequestIdRef.current;
  }, [clearPositionRetryTimer]);

  const sendPositionUpdate = useCallback(
    async (inputUpdate: {
      conceptId: string;
      x: number;
      y: number;
      clientMutationId: string;
    }) => {
      const pendingLocalOp = {
        clientId: input.clientId,
        clientMutationId: inputUpdate.clientMutationId,
        opKind: MAP_GRAPH_OP_KIND_CONCEPT_POSITION_SET,
        entityType: "concept" as const,
        entityId: inputUpdate.conceptId,
      };
      const pendingKey = getPendingGraphOperationKey(
        input.clientId,
        inputUpdate.clientMutationId
      );

      input.addPendingLocalOp(pendingLocalOp);

      const response = await fetch(
        `/api/maps/${input.mapId}/concepts/${inputUpdate.conceptId}/position`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: input.getExpectedRevision(),
            clientId: input.clientId,
            clientMutationId: inputUpdate.clientMutationId,
            x: Math.round(inputUpdate.x),
            y: Math.round(inputUpdate.y),
          }),
        }
      );

      const body = (await response.json().catch(() => null)) as
        | (ConceptPositionMutationResponse & {
            currentRevision?: number;
            error?: string;
          })
        | null;

      if (response.status === 409) {
        input.clearPendingLocalOp(pendingKey);
        throw new GraphRevisionConflictError(
          body?.error ?? "Map changed since your last snapshot. Refresh and try again.",
          typeof body?.currentRevision === "number" ? body.currentRevision : null
        );
      }

      if (!response.ok || !body?.ok) {
        input.clearPendingLocalOp(pendingKey);
        throw new Error(body?.error ?? "Unable to update concept positions.");
      }

      input.clearPendingLocalOp(pendingKey);
      return body;
    },
    [
      input,
    ]
  );

  const persistConceptPosition = useCallback(
    async (
      conceptId: string,
      x: number,
      y: number,
      options?: {
        requestId?: number;
        retryCount?: number;
        clientMutationId?: string;
      }
    ) => {
      const requestId = options?.requestId ?? positionSaveRequestIdRef.current;
      const retryCount = options?.retryCount ?? 0;
      const clientMutationId =
        options?.clientMutationId ?? createGraphClientMutationId();
      const nextPersistenceState = input.reducePositionPersistenceState(
        retryCount > 0
          ? {
              phase: "saving",
              retryCount: retryCount - 1,
              errorMessage: null,
            }
          : input.initialPersistenceState,
        retryCount > 0 ? { type: "retry" } : { type: "saving" }
      );

      input.setDragState({
        ...input.dragStateRef.current,
        phase: nextPersistenceState.phase,
        conceptId,
        currentGraphPosition: { x, y },
        pendingLongPress: false,
        retryCount: nextPersistenceState.retryCount,
        errorMessage: null,
      });

      try {
        const result = await sendPositionUpdate({
          conceptId,
          x,
          y,
          clientMutationId,
        });
        if (requestId !== positionSaveRequestIdRef.current) {
          return;
        }

        input.onMutationCommitted(result);

        if (input.dragSessionRef.current === null) {
          input.resetDragState();
        }
      } catch (error) {
        if (requestId !== positionSaveRequestIdRef.current) {
          return;
        }

        if (error instanceof GraphRevisionConflictError) {
          clearPositionRetryTimer();
          input.onConflict();

          const errorState = input.reducePositionPersistenceState(
            {
              phase: "saving",
              retryCount,
              errorMessage: null,
            },
            {
              type: "error",
              message: error.message,
            }
          );

          if (input.dragSessionRef.current === null) {
            input.setDragState({
              ...input.dragStateRef.current,
              phase: errorState.phase,
              conceptId,
              currentGraphPosition: { x, y },
              pendingLongPress: false,
              retryCount: errorState.retryCount,
              errorMessage: errorState.errorMessage,
            });
          }
          return;
        }

        if (retryCount < 1) {
          clearPositionRetryTimer();
          positionRetryTimerRef.current = setTimeout(() => {
            positionRetryTimerRef.current = null;
            void persistConceptPositionRef.current?.(conceptId, x, y, {
              requestId,
              retryCount: retryCount + 1,
              clientMutationId,
            });
          }, input.retryDelayMs);
          return;
        }

        const failureMessage =
          error instanceof Error
            ? error.message
            : input.positionSaveFailedMessage;
        const errorState = input.reducePositionPersistenceState(
          {
            phase: "saving",
            retryCount,
            errorMessage: null,
          },
          {
            type: "error",
            message: failureMessage,
          }
        );

        if (input.dragSessionRef.current === null) {
          input.setDragState({
            ...input.dragStateRef.current,
            phase: errorState.phase,
            conceptId,
            currentGraphPosition: { x, y },
            pendingLongPress: false,
            retryCount: errorState.retryCount,
            errorMessage: errorState.errorMessage,
          });
        }
      }
    },
    [clearPositionRetryTimer, input, sendPositionUpdate]
  );

  useEffect(() => {
    persistConceptPositionRef.current = persistConceptPosition;
  }, [persistConceptPosition]);

  useEffect(() => {
    return () => {
      clearPositionRetryTimer();
    };
  }, [clearPositionRetryTimer]);

  return {
    clearPositionRetryTimer,
    createPositionMutationRequestId,
    persistConceptPosition,
  };
}

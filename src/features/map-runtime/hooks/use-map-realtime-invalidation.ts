"use client";

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import {
  type MapGraphOperation,
  type MapGraphOperationsResponse,
  isConceptArchiveOperation,
  isConceptCreateOperation,
  isConceptPositionSetOperation,
  getPendingGraphOperationKey,
  isLinkArchiveOperation,
  isLinkCreateOperation,
} from "@/features/map-runtime/realtime/contracts";
import { subscribeToMapRevisionInvalidation } from "@/features/map-runtime/realtime/browser-transport";

type UseMapRealtimeInvalidationInput = {
  mapId: string;
  clientId: string;
  dragPhase: "idle" | "press" | "dragging" | "saving" | "error";
  lastAppliedSeqRef: MutableRefObject<number>;
  setLastAppliedSeq: (seq: number) => void;
  setNeedsSnapshotFallback: (value: boolean) => void;
  hasActiveLocalEntityLock: (entityId: string) => boolean;
  clearPendingLocalOp: (key: string) => void;
  applyIncomingOperation: (operation: MapGraphOperation) => boolean;
  fetchLatestSnapshot: () => Promise<unknown>;
};

function sortBySeqAscending(operations: MapGraphOperation[]) {
  return [...operations].sort((left, right) => left.seq - right.seq);
}

export function useMapRealtimeInvalidation(
  input: UseMapRealtimeInvalidationInput
) {
  const deferredOperationsRef = useRef<MapGraphOperation[]>([]);
  const replayRequestInFlightRef = useRef(false);

  const triggerSnapshotFallback = useCallback(() => {
    input.setNeedsSnapshotFallback(true);
    void input.fetchLatestSnapshot();
  }, [input]);

  const enqueueDeferredOperation = useCallback((operation: MapGraphOperation) => {
    const remaining = deferredOperationsRef.current.filter(
      (candidate) =>
        !(
          candidate.entityId === operation.entityId &&
          candidate.entityType === operation.entityType
        )
    );
    remaining.push(operation);
    deferredOperationsRef.current = sortBySeqAscending(remaining);
  }, []);

  const applyOperation = useCallback(
    (operation: MapGraphOperation) => {
      const isSupportedOperation =
        isConceptPositionSetOperation(operation) ||
        isConceptCreateOperation(operation) ||
        isConceptArchiveOperation(operation) ||
        isLinkCreateOperation(operation) ||
        isLinkArchiveOperation(operation);

      if (!isSupportedOperation) {
        triggerSnapshotFallback();
        return false;
      }

      if (operation.clientId === input.clientId) {
        input.clearPendingLocalOp(
          getPendingGraphOperationKey(
            operation.clientId,
            operation.clientMutationId
          )
        );
        return true;
      }

      if (input.hasActiveLocalEntityLock(operation.entityId)) {
        enqueueDeferredOperation(operation);
        return true;
      }

      const applied = input.applyIncomingOperation(operation);
      if (!applied) {
        triggerSnapshotFallback();
        return false;
      }

      return true;
    },
    [enqueueDeferredOperation, input, triggerSnapshotFallback]
  );

  const replayOperationsAfterSeq = useCallback(
    async (afterSeq: number) => {
      if (replayRequestInFlightRef.current) {
        return;
      }

      replayRequestInFlightRef.current = true;
      try {
        let cursor = afterSeq;

        while (true) {
          const response = await fetch(
            `/api/maps/${input.mapId}/ops?afterSeq=${cursor}&limit=100`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          if (!response.ok) {
            triggerSnapshotFallback();
            return;
          }

          const body = (await response.json()) as MapGraphOperationsResponse;
          const operations = body.ops ?? [];

          if (operations.length === 0) {
            input.setNeedsSnapshotFallback(false);
            return;
          }

          for (const operation of operations) {
            if (operation.seq !== cursor + 1) {
              triggerSnapshotFallback();
              return;
            }

            const applied = applyOperation(operation);
            if (!applied) {
              return;
            }

            cursor = operation.seq;
            input.lastAppliedSeqRef.current = operation.seq;
            input.setLastAppliedSeq(operation.seq);
          }

          input.setNeedsSnapshotFallback(false);

          if (!body.hasMore && !body.cursor?.hasMore) {
            return;
          }
        }
      } catch {
        triggerSnapshotFallback();
      } finally {
        replayRequestInFlightRef.current = false;
      }
    },
    [applyOperation, input, triggerSnapshotFallback]
  );

  const flushDeferredOperations = useCallback(() => {
    if (input.dragPhase !== "idle" || deferredOperationsRef.current.length === 0) {
      return;
    }

    const deferredOperations = sortBySeqAscending(deferredOperationsRef.current);
    deferredOperationsRef.current = [];

    for (const operation of deferredOperations) {
      const applied = input.applyIncomingOperation(operation);
      if (!applied) {
        triggerSnapshotFallback();
        return;
      }
    }
  }, [input, triggerSnapshotFallback]);

  useEffect(() => {
    if (input.dragPhase !== "idle") {
      return;
    }

    flushDeferredOperations();
  }, [flushDeferredOperations, input.dragPhase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unsubscribe = subscribeToMapRevisionInvalidation(input.mapId, {
      onEvent: ({ revision }) => {
        if (
          typeof revision === "number" &&
          Number.isFinite(revision) &&
          revision <= input.lastAppliedSeqRef.current
        ) {
          return;
        }

        void replayOperationsAfterSeq(input.lastAppliedSeqRef.current);
      },
      onSubscribed: (isResubscribe) => {
        if (!isResubscribe) {
          return;
        }

        void replayOperationsAfterSeq(input.lastAppliedSeqRef.current);
      },
    });

    const handleWindowFocus = () => {
      void replayOperationsAfterSeq(input.lastAppliedSeqRef.current);
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      unsubscribe();
    };
  }, [input.mapId, input.lastAppliedSeqRef, replayOperationsAfterSeq]);
}

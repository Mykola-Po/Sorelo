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
import {
  mapTransportTelemetryActions,
  type MapTransportClientTelemetryEvent,
  type MapTransportReplayTrigger,
  type MapTransportSnapshotFallbackReason,
} from "@/features/map-runtime/realtime/transport-telemetry";

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

  const sendTransportTelemetry = useCallback(
    (event: MapTransportClientTelemetryEvent) => {
      void fetch(`/api/maps/${input.mapId}/telemetry/transport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        cache: "no-store",
        keepalive:
          event.action === mapTransportTelemetryActions.transportResubscribe,
      }).catch(() => {
        // Telemetry must never block runtime recovery.
      });
    },
    [input.mapId]
  );

  const triggerSnapshotFallback = useCallback(
    (
      reason: MapTransportSnapshotFallbackReason,
      afterSeq: number,
      operation?: { opKind: string }
    ) => {
      sendTransportTelemetry({
        action: mapTransportTelemetryActions.snapshotFallback,
        reason,
        afterSeq,
        ...(operation ? { opKind: operation.opKind } : {}),
      });

      input.setNeedsSnapshotFallback(true);
      void input.fetchLatestSnapshot();
    },
    [input, sendTransportTelemetry]
  );

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
        const unsupportedOperation = operation as unknown as {
          seq?: number;
          opKind?: string;
        };

        triggerSnapshotFallback(
          "unsupported_op",
          Math.max(
            0,
            (unsupportedOperation.seq ?? input.lastAppliedSeqRef.current) - 1
          ),
          unsupportedOperation.opKind
            ? { opKind: unsupportedOperation.opKind }
            : undefined
        );
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
        triggerSnapshotFallback("apply_failed", operation.seq - 1, operation);
        return false;
      }

      return true;
    },
    [enqueueDeferredOperation, input, triggerSnapshotFallback]
  );

  const replayOperationsAfterSeq = useCallback(
    async (afterSeq: number, trigger: MapTransportReplayTrigger) => {
      if (replayRequestInFlightRef.current) {
        return;
      }

      replayRequestInFlightRef.current = true;
      try {
        let cursor = afterSeq;
        let replayedCount = 0;

        while (true) {
          const response = await fetch(
            `/api/maps/${input.mapId}/ops?afterSeq=${cursor}&limit=100`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          if (!response.ok) {
            triggerSnapshotFallback("response_not_ok", cursor);
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
              triggerSnapshotFallback("missing_sequence", cursor, operation);
              return;
            }

            const applied = applyOperation(operation);
            if (!applied) {
              return;
            }

            cursor = operation.seq;
            replayedCount += 1;
            input.lastAppliedSeqRef.current = operation.seq;
            input.setLastAppliedSeq(operation.seq);
          }

          input.setNeedsSnapshotFallback(false);

          if (!body.hasMore && !body.cursor?.hasMore) {
            if (replayedCount > 0) {
              sendTransportTelemetry({
                action: mapTransportTelemetryActions.opsReplayed,
                trigger,
                opCount: replayedCount,
                fromSeq: afterSeq,
                toSeq: cursor,
              });

              if (trigger !== "revision_event" && afterSeq > 0) {
                sendTransportTelemetry({
                  action: mapTransportTelemetryActions.gapRecovery,
                  trigger,
                  opCount: replayedCount,
                  fromSeq: afterSeq,
                  toSeq: cursor,
                });
              }
            }

            return;
          }
        }
      } catch {
        triggerSnapshotFallback("network_error", afterSeq);
      } finally {
        replayRequestInFlightRef.current = false;
      }
    },
    [applyOperation, input, sendTransportTelemetry, triggerSnapshotFallback]
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
        triggerSnapshotFallback("apply_failed", operation.seq - 1, operation);
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

        void replayOperationsAfterSeq(
          input.lastAppliedSeqRef.current,
          "revision_event"
        );
      },
      onSubscribed: (isResubscribe) => {
        if (!isResubscribe) {
          return;
        }

        sendTransportTelemetry({
          action: mapTransportTelemetryActions.transportResubscribe,
          afterSeq: input.lastAppliedSeqRef.current,
        });
        void replayOperationsAfterSeq(
          input.lastAppliedSeqRef.current,
          "transport_resubscribe"
        );
      },
    });

    const handleWindowFocus = () => {
      void replayOperationsAfterSeq(
        input.lastAppliedSeqRef.current,
        "window_focus"
      );
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      unsubscribe();
    };
  }, [
    input.lastAppliedSeqRef,
    input.mapId,
    replayOperationsAfterSeq,
    sendTransportTelemetry,
  ]);
}

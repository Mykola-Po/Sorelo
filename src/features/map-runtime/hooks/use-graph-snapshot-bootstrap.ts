"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphSnapshot } from "@/features/map-runtime/types";

type UseGraphSnapshotBootstrapInput = {
  mapId: string;
  snapshot: GraphSnapshot | null;
  setSnapshot: (snapshot: GraphSnapshot) => void;
  setLastAppliedSeq: (seq: number) => void;
  setNeedsSnapshotFallback: (value: boolean) => void;
  clearPositions: () => void;
};

export function useGraphSnapshotBootstrap(
  input: UseGraphSnapshotBootstrapInput
) {
  const {
    clearPositions,
    mapId,
    setLastAppliedSeq,
    setNeedsSnapshotFallback,
    setSnapshot,
    snapshot,
  } = input;
  const snapshotRequestControllerRef = useRef<AbortController | null>(null);
  const snapshotRequestIdRef = useRef(0);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(snapshot === null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const fetchLatestSnapshot = useCallback(async () => {
    const requestId = snapshotRequestIdRef.current + 1;
    snapshotRequestIdRef.current = requestId;

    snapshotRequestControllerRef.current?.abort();
    const controller = new AbortController();
    snapshotRequestControllerRef.current = controller;

    const shouldShowLoadingState = snapshot === null;
    if (shouldShowLoadingState) {
      setIsSnapshotLoading(true);
    }
    setSnapshotError(null);

    try {
      const response = await fetch(`/api/maps/${mapId}/graph`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Unable to load graph snapshot.");
      }

      const nextSnapshot = (await response.json()) as GraphSnapshot;
      if (
        controller.signal.aborted ||
        requestId !== snapshotRequestIdRef.current
      ) {
        return null;
      }

      clearPositions();
      setSnapshot(nextSnapshot);
      setLastAppliedSeq(nextSnapshot.revision);
      setNeedsSnapshotFallback(false);
      return nextSnapshot;
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestId !== snapshotRequestIdRef.current
      ) {
        return null;
      }

      setSnapshotError(
        error instanceof Error
          ? error.message
          : "Unable to load graph snapshot."
      );
      return null;
    } finally {
      if (requestId === snapshotRequestIdRef.current) {
        setIsSnapshotLoading(false);
      }
    }
  }, [
    clearPositions,
    mapId,
    setLastAppliedSeq,
    setNeedsSnapshotFallback,
    setSnapshot,
    snapshot,
  ]);

  useEffect(() => {
    if (snapshot !== null) {
      setIsSnapshotLoading(false);
      return;
    }

    void fetchLatestSnapshot();
  }, [fetchLatestSnapshot, snapshot]);

  useEffect(() => {
    return () => {
      snapshotRequestControllerRef.current?.abort();
      snapshotRequestControllerRef.current = null;
    };
  }, []);

  return {
    fetchLatestSnapshot,
    isSnapshotLoading,
    snapshotError,
  };
}

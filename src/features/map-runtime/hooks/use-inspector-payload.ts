"use client";

import { useEffect, useRef, useState } from "react";

import type { InspectorPayload, InspectorSelection } from "@/features/inspector/types";

export function useInspectorPayload(mapId: string, selection: InspectorSelection) {
  const [payload, setPayload] = useState<InspectorPayload | null>(null);
  const [payloadSelectionKey, setPayloadSelectionKey] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payloadSelectionKeyRef = useRef(payloadSelectionKey);
  const selectionKey =
    selection.kind === "concept" || selection.kind === "link"
      ? `${selection.kind}:${selection.id}`
      : null;

  useEffect(() => {
    payloadSelectionKeyRef.current = payloadSelectionKey;
  }, [payloadSelectionKey]);

  useEffect(() => {
    if (selection.kind !== "concept" && selection.kind !== "link") {
      setPayload(null);
      setPayloadSelectionKey(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const selectedKind = selection.kind;
    const selectedId = selection.id;

    const controller = new AbortController();

    async function loadPayload() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/maps/${mapId}/inspector?kind=${selectedKind}&id=${selectedId}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Unable to load inspector details.");
        }

        const nextPayload = (await response.json()) as InspectorPayload;
        setPayload(nextPayload);
        setPayloadSelectionKey(`${selectedKind}:${selectedId}`);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load inspector details."
        );
        if (payloadSelectionKeyRef.current !== `${selectedKind}:${selectedId}`) {
          setPayload(null);
          setPayloadSelectionKey(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPayload();

    return () => {
      controller.abort();
    };
  }, [mapId, selection]);

  const activePayload = payloadSelectionKey === selectionKey ? payload : null;

  return {
    payload: activePayload,
    isLoading,
    error,
  };
}

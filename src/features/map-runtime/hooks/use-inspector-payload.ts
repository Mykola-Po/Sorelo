"use client";

import { useEffect, useState } from "react";

import type { InspectorPayload, InspectorSelection } from "@/features/inspector/types";

export function useInspectorPayload(mapId: string, selection: InspectorSelection) {
  const [payload, setPayload] = useState<InspectorPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selection.kind !== "concept" && selection.kind !== "link") {
      setPayload(null);
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
          throw new Error("Unable to load inspector details.");
        }

        const nextPayload = (await response.json()) as InspectorPayload;
        setPayload(nextPayload);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load inspector details."
        );
        setPayload(null);
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

  return {
    payload,
    isLoading,
    error,
  };
}

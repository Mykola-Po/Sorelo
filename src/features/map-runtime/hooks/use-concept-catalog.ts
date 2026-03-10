"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConceptCatalogEntry } from "@/features/map-runtime/types";

export function useConceptCatalog(mapId: string) {
  const [catalog, setCatalog] = useState<ConceptCatalogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/maps/${mapId}/concept-catalog`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load concept catalog.");
        }

        const payload = (await response.json()) as {
          concepts?: ConceptCatalogEntry[];
        };

        if (!cancelled) {
          setCatalog(payload.concepts ?? []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load concept catalog."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCatalog = useMemo(() => {
    if (!normalizedQuery) {
      return catalog.slice(0, 24);
    }

    return catalog
      .filter((concept) =>
        concept.title.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 24);
  }, [catalog, normalizedQuery]);

  return {
    catalog,
    filteredCatalog,
    query,
    setQuery,
    isLoading,
    error,
  };
}

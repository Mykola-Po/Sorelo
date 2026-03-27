import { useEffect, useRef, type RefObject } from "react";
import ForceAtlas2Worker from "graphology-layout-forceatlas2/worker";
import type { Sigma } from "sigma";
import { cosineSimilarity } from "../utils/semantic-math";
import { useMapStore } from "../store/map-store-provider";

const MOCK_EMBEDDINGS: Record<string, number[]> = {
  fact: [1.0, 0.0, 0.0, 0.5],
  experience: [0.0, 1.0, 0.0, 0.5],
  belief: [0.0, 0.0, 1.0, 0.5],
  state: [0.5, 0.5, 0.0, 1.0],
  trigger: [1.0, 0.0, 1.0, 0.0],
  thought: [0.0, 1.0, 1.0, 0.0],
  custom: [0.5, 0.5, 0.5, 0.5],
};

function getMockEmbedding(type: string | undefined): number[] {
  return MOCK_EMBEDDINGS[type || "custom"] ?? MOCK_EMBEDDINGS["custom"]!;
}

export function useSemanticGravity(
  sigmaRef: RefObject<Sigma | null>,
  enabled: boolean
) {
  const workerRef = useRef<ForceAtlas2Worker | null>(null);
  const syncPositionsInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateConceptPosition = useMapStore(s => s.updateConceptPosition);

  useEffect(() => {
    const sigma = sigmaRef.current;

    if (!sigma || !enabled) {
      if (workerRef.current) {
        workerRef.current.kill();
        workerRef.current = null;
      }
      if (syncPositionsInterval.current) {
        clearInterval(syncPositionsInterval.current);
        syncPositionsInterval.current = null;
      }
      return;
    }

    const graph = sigma.getGraph();

    // Re-calculate mock semantic edges as edge weights before starting layout
    graph.forEachNode((nodeA, attrA) => {
      const vecA = getMockEmbedding(attrA.conceptType);
      
      graph.forEachNode((nodeB, attrB) => {
        if (nodeA === nodeB) return;
        
        // Prevent dupes
        if (nodeA > nodeB) return;

        const vecB = getMockEmbedding(attrB.conceptType);
        const sim = cosineSimilarity(vecA, vecB);

        // If similarity is very high, strongly attract
        if (sim > 0.8) {
          if (!graph.hasEdge(nodeA, nodeB)) {
            // Add invisible semantic gravity edge
            graph.addEdge(nodeA, nodeB, {
              weight: sim * 10,
              hidden: true,
              size: 0,
            });
          }
        }
      });
    });

    const hasEdges = graph.order > 0 && graph.size > 0;
    if (!hasEdges) return; // FA2 explodes with 0 edges/nodes sometimes

    workerRef.current = new ForceAtlas2Worker(graph, {
      settings: {
        gravity: 0.1,
        scalingRatio: 10,
        slowDown: 2,
        barnesHutOptimize: true,
        barnesHutTheta: 0.5,
        edgeWeightInfluence: 1, // Pay attention to our semantic weights
      },
    });

    workerRef.current.start();

    // Background sync of positions to Zustand
    syncPositionsInterval.current = setInterval(() => {
      sigma.refresh();
      graph.forEachNode((id, attr) => {
         updateConceptPosition(id, { x: attr.x, y: attr.y });
      });
    }, 100);

    return () => {
      if (workerRef.current) {
        workerRef.current.kill();
        workerRef.current = null;
      }
      if (syncPositionsInterval.current) {
        clearInterval(syncPositionsInterval.current);
        syncPositionsInterval.current = null;
      }
    };
  }, [enabled, sigmaRef, updateConceptPosition]);
}

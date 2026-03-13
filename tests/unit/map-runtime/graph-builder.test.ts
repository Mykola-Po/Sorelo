import { describe, it, expect } from "vitest";
import { buildGraphologyInstance } from "@/features/map-runtime/renderers/graph-builder";
import type { GraphSnapshot } from "@/features/map-runtime/types";

describe("Graphology Graph Builder", () => {
  it("should create an empty graph if snapshot is empty", () => {
    const snapshot: GraphSnapshot = {
      revision: 1,
      counts: { conceptCount: 0, linkCount: 0 },
      concepts: [],
      links: [],
    };

    const graph = buildGraphologyInstance(snapshot);
    expect(graph.order).toBe(0); // number of nodes
    expect(graph.size).toBe(0); // number of edges
  });

  it("should map concept nodes to graphology nodes with correct attributes", () => {
    const snapshot: GraphSnapshot = {
      revision: 1,
      counts: { conceptCount: 2, linkCount: 0 },
      concepts: [
        {
          id: "concept-1",
          title: "Node A",
          conceptType: "fact",
          summary: "First node",
          description: null,
          x: 100,
          y: 200,
          updatedAt: new Date().toISOString(),
        },
        {
          id: "concept-2",
          title: "Node B",
          conceptType: "thought",
          summary: null,
          description: null,
          x: 500,
          y: 600,
          updatedAt: new Date().toISOString(),
        },
      ],
      links: [],
    };

    const graph = buildGraphologyInstance(snapshot);
    expect(graph.order).toBe(2);
    expect(graph.hasNode("concept-1")).toBe(true);

    const attr1 = graph.getNodeAttributes("concept-1");
    expect(attr1.x).toBe(100);
    expect(attr1.y).toBe(200);
    expect(attr1.label).toBe("Node A");
    expect(attr1.conceptType).toBe("fact");
    expect(attr1.color).toBe("#3e63dd"); // color logic for fact

    const attr2 = graph.getNodeAttributes("concept-2");
    expect(attr2.label).toBe("Node B");
    expect(attr2.color).toBe("#297c3b"); // color logic for thought
  });

  it("should map link edges correctly", () => {
    const snapshot: GraphSnapshot = {
      revision: 1,
      counts: { conceptCount: 2, linkCount: 1 },
      concepts: [
        { id: "c1", title: "C1", conceptType: "custom", summary: null, description: null, x: 0, y: 0, updatedAt: "" },
        { id: "c2", title: "C2", conceptType: "custom", summary: null, description: null, x: 0, y: 0, updatedAt: "" },
      ],
      links: [
        {
          id: "link-1",
          sourceConceptId: "c1",
          targetConceptId: "c2",
          relationType: "causes",
          strength: 1,
          description: null,
          updatedAt: "",
        },
      ],
    };

    const graph = buildGraphologyInstance(snapshot);
    expect(graph.size).toBe(1);
    expect(graph.hasEdge("link-1")).toBe(true);

    const edgeAttr = graph.getEdgeAttributes("link-1");
    expect(edgeAttr.label).toBe("causes");
    expect(edgeAttr.relationType).toBe("causes");
    expect(edgeAttr.color).toBe("#e54d2e");
  });

  it("should ignore edges that reference missing nodes", () => {
    const snapshot: GraphSnapshot = {
      revision: 1,
      counts: { conceptCount: 1, linkCount: 1 },
      concepts: [
        { id: "c1", title: "C1", conceptType: "custom", summary: null, description: null, x: 0, y: 0, updatedAt: "" },
      ],
      links: [
        {
          id: "link-1",
          sourceConceptId: "c1",
          targetConceptId: "missing-c2",
          relationType: "explains",
          strength: 1,
          description: null,
          updatedAt: "",
        },
      ],
    };

    const graph = buildGraphologyInstance(snapshot);
    expect(graph.order).toBe(1);
    expect(graph.size).toBe(0); // edge should not be added
  });
});

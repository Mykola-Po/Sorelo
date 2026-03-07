import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type NodeInput = {
  id: string;
  title: string;
  type: string;
  confidence: number;
};

type EdgeInput = {
  sourceId: string;
  targetId: string;
  relationType: string;
  strength: number;
};

type ScenarioRequest = {
  workspaceId: string;
  seedNodeId?: string;
  inputContext: string;
  nodes: NodeInput[];
  edges: EdgeInput[];
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as ScenarioRequest;
    const seedNode = body.nodes.find((node) => node.id === body.seedNodeId) ?? null;

    const relatedEdges = body.edges.filter((edge) => edge.sourceId === body.seedNodeId || edge.targetId === body.seedNodeId);
    const relatedNodeIds = new Set<string>();
    for (const edge of relatedEdges) {
      relatedNodeIds.add(edge.sourceId);
      relatedNodeIds.add(edge.targetId);
    }

    const pathNodes = body.nodes.filter((node) => relatedNodeIds.has(node.id)).slice(0, 6);
    const explanationPath = pathNodes.map((node) => `${node.title} (${node.type})`);

    const context = body.inputContext?.trim() || "No additional context";
    const seedLabel = seedNode ? `${seedNode.title} (${seedNode.type})` : "selected scope";

    const weightedConfidence = seedNode?.confidence ?? 0.5;
    const confidenceLabel = weightedConfidence >= 0.75 ? "high" : weightedConfidence >= 0.45 ? "medium" : "low";

    const resultText = [
      `Scenario for ${seedLabel}.`,
      `Context: ${context}.`,
      `Likely short-term reaction chain involves ${Math.max(explanationPath.length, 1)} core factors.`,
      `This is a deterministic explainability stub; replace with model call in production.`
    ].join(" ");

    return Response.json({
      resultText,
      explanationPath,
      confidenceLabel
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
});
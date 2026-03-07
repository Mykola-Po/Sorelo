import { getSupabaseBrowserClient } from "@/services/supabase/client";

export type ScenarioRequest = {
  workspaceId: string;
  seedNodeId?: string;
  seedClusterId?: string;
  inputContext: string;
  nodes: Array<{ id: string; title: string; type: string; confidence: number }>;
  edges: Array<{ sourceId: string; targetId: string; relationType: string; strength: number }>;
};

export type ScenarioResponse = {
  resultText: string;
  explanationPath: string[];
  confidenceLabel: "low" | "medium" | "high";
};

export interface AiProvider {
  runScenario(request: ScenarioRequest): Promise<ScenarioResponse>;
  parseInboxText(input: string): Promise<string[]>;
}

export class EdgeFunctionAiProvider implements AiProvider {
  async runScenario(request: ScenarioRequest): Promise<ScenarioResponse> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke("scenario-runner", {
      body: request
    });

    if (error) {
      throw new Error(error.message);
    }

    const response = data as ScenarioResponse;
    return {
      resultText: response.resultText,
      explanationPath: response.explanationPath ?? [],
      confidenceLabel: response.confidenceLabel ?? "medium"
    };
  }

  async parseInboxText(input: string): Promise<string[]> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke("inbox-parse", {
      body: { text: input }
    });

    if (error) {
      throw new Error(error.message);
    }

    const payload = data as { items?: string[] };
    return payload.items ?? [];
  }
}
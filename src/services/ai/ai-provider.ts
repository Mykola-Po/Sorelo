export type ScenarioRequest = {
  workspaceId: string;
  seedNodeId?: string;
  seedClusterId?: string;
  inputContext: string;
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
  async runScenario(): Promise<ScenarioResponse> {
    throw new Error("Scenario runner is not connected yet.");
  }

  async parseInboxText(): Promise<string[]> {
    throw new Error("Inbox parser is not connected yet.");
  }
}

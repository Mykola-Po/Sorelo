import { NextResponse } from "next/server";

import { upsertScenarioStepFeedbackCommand } from "@/features/scenarios/commands";
import { submitScenarioStepFeedbackRouteSchema } from "@/features/scenarios/schemas";
import {
  parseRouteJson,
  requireMapRuntimeAccess,
} from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
    runId: string;
    stepId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { mapId, runId, stepId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(
    request,
    submitScenarioStepFeedbackRouteSchema
  );

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const feedback = await upsertScenarioStepFeedbackCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      scenarioRunId: runId,
      scenarioRunStepId: stepId,
      verdict: parsed.data.verdict,
      correctedExplanation: parsed.data.correctedExplanation ?? null,
      correctedScore: parsed.data.correctedScore ?? null,
    });

    return NextResponse.json({
      ok: true,
      feedback,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save scenario step feedback.",
      },
      { status: 500 }
    );
  }
}

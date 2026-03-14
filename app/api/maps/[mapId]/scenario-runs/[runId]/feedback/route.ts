import { NextResponse } from "next/server";

import { upsertScenarioRunFeedbackCommand } from "@/features/scenarios/commands";
import { submitScenarioRunFeedbackRouteSchema } from "@/features/scenarios/schemas";
import {
  parseRouteJson,
  requireMapRuntimeAccess,
} from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
    runId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { mapId, runId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(
    request,
    submitScenarioRunFeedbackRouteSchema
  );

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const feedback = await upsertScenarioRunFeedbackCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      scenarioRunId: runId,
      overallScore: parsed.data.overallScore,
      verdict: parsed.data.verdict,
      feedbackText: parsed.data.feedbackText ?? null,
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
            : "Unable to save scenario run feedback.",
      },
      { status: 500 }
    );
  }
}

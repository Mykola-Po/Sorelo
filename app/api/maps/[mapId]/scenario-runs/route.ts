import { NextResponse } from "next/server";
import { z } from "zod";

import { runScenarioCommand } from "@/features/scenarios/commands";
import {
  parseRouteJson,
  requireMapRuntimeAccess,
} from "@/features/map-runtime/server";

export const runtime = "nodejs";

const runScenarioRouteSchema = z.object({
  scenarioId: z.string().uuid().optional().nullable(),
  triggerText: z.string().trim().min(3),
  seedConceptIds: z.array(z.string().uuid()).default([]),
});

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { mapId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(request, runScenarioRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const runId = await runScenarioCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      scenarioId: parsed.data.scenarioId ?? null,
      triggerText: parsed.data.triggerText,
      seedConceptIds: parsed.data.seedConceptIds,
    });

    return NextResponse.json(
      {
        ok: true,
        runId,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run scenario.",
      },
      { status: 500 }
    );
  }
}

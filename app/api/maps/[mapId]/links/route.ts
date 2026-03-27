import { NextResponse } from "next/server";

import { createLinkCommand } from "@/features/links/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
import { getMapGraphMetrics } from "@/features/maps/queries";
import { createLinkRouteSchema } from "@/features/map-runtime/schemas";
import { parseRouteJson, requireMapRuntimeAccess } from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { mapId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(request, createLinkRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const link = await createLinkCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description ?? null,
    });
    const metrics = await getMapGraphMetrics(mapId, access.workspaceId);

    return NextResponse.json(
      {
        ok: true,
        revision: metrics?.revision ?? 0,
        link,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof MapRevisionConflictError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
          currentRevision: error.currentRevision,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create link.",
      },
      { status: 500 }
    );
  }
}

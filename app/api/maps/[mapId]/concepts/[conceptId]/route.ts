import { NextResponse } from "next/server";

import { updateConceptCommand } from "@/features/concepts/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
import { getMapGraphMetrics } from "@/features/maps/queries";
import { updateConceptRouteSchema } from "@/features/map-runtime/schemas";
import { parseRouteJson, requireMapRuntimeAccess } from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
    conceptId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { mapId, conceptId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(request, updateConceptRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const concept = await updateConceptCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      conceptId,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary ?? null,
      description: parsed.data.description ?? null,
      x: parsed.data.x,
      y: parsed.data.y,
    });
    const metrics = await getMapGraphMetrics(mapId, access.workspaceId);

    return NextResponse.json({
      ok: true,
      revision: metrics?.revision ?? 0,
      concept,
    });
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
          error instanceof Error
            ? error.message
            : "Unable to update concept.",
      },
      { status: 500 }
    );
  }
}

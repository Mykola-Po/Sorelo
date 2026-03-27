import { NextResponse } from "next/server";

import { repositionConceptCommand } from "@/features/concepts/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
import { getMapRevision } from "@/features/maps/queries";
import { patchConceptPositionRouteSchema } from "@/features/map-runtime/schemas";
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
  const parsed = await parseRouteJson(request, patchConceptPositionRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const concept = await repositionConceptCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      conceptId,
      x: parsed.data.x,
      y: parsed.data.y,
    });
    const revision = await getMapRevision(mapId, access.workspaceId);

    return NextResponse.json({
      ok: true,
      revision: revision ?? 0,
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
            : "Unable to update concept position.",
      },
      { status: 500 }
    );
  }
}

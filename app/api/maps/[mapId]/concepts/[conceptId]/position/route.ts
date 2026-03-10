import { NextResponse } from "next/server";

import { repositionConceptCommand } from "@/features/concepts/commands";
import { getMapGraphMetrics } from "@/features/maps/queries";
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
      conceptId,
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

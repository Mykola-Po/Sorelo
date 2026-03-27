import { NextResponse } from "next/server";

import { repositionConceptsBatchCommand } from "@/features/concepts/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
import { getMapRevision } from "@/features/maps/queries";
import { patchConceptPositionsRouteSchema } from "@/features/map-runtime/schemas";
import { parseRouteJson, requireMapRuntimeAccess } from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

async function handlePositionsPatch(request: Request, params: RouteParams["params"]) {
  const { mapId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(request, patchConceptPositionsRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const concepts = await repositionConceptsBatchCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      positions: parsed.data.positions,
    });
    const revision = await getMapRevision(mapId, access.workspaceId);

    return NextResponse.json({
      ok: true,
      revision: revision ?? 0,
      concepts,
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
            : "Unable to update concept positions.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return handlePositionsPatch(request, params);
}

export async function POST(request: Request, { params }: RouteParams) {
  return handlePositionsPatch(request, params);
}

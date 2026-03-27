import { NextResponse } from "next/server";

import { deleteLinkCommand, updateLinkCommand } from "@/features/links/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
import { getMapGraphMetrics } from "@/features/maps/queries";
import { parseRouteJson, requireMapRuntimeAccess } from "@/features/map-runtime/server";
import {
  deleteLinkRouteSchema,
  updateLinkRouteSchema,
} from "@/features/map-runtime/schemas";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
    linkId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { mapId, linkId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(request, updateLinkRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const link = await updateLinkCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      linkId,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description ?? null,
    });
    const metrics = await getMapGraphMetrics(mapId, access.workspaceId);

    return NextResponse.json({
      ok: true,
      revision: metrics?.revision ?? 0,
      link,
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
          error instanceof Error ? error.message : "Unable to update link.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const { mapId, linkId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(_, deleteLinkRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    await deleteLinkCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      linkId,
    });
    const metrics = await getMapGraphMetrics(mapId, access.workspaceId);

    return NextResponse.json({
      ok: true,
      revision: metrics?.revision ?? 0,
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
          error instanceof Error ? error.message : "Unable to delete link.",
      },
      { status: 500 }
    );
  }
}

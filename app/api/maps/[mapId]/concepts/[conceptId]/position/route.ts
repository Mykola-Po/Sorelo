import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { repositionConceptWithOperationCommand } from "@/features/concepts/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
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
    const clientId = parsed.data.clientId ?? user.id;
    const clientMutationId = parsed.data.clientMutationId ?? randomUUID();
    const result = await repositionConceptWithOperationCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      conceptId,
      x: parsed.data.x,
      y: parsed.data.y,
      clientId,
      clientMutationId,
    });

    return NextResponse.json({
      ok: true,
      revision: result.revision,
      seq: result.seq,
      concept: result.concept,
      op: result.op,
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

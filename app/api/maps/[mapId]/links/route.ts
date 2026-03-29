import { NextResponse } from "next/server";

import { createLinkWithOperationCommand } from "@/features/links/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
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
    const result = await createLinkWithOperationCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description ?? null,
      ...(parsed.data.clientId
        ? {
            clientId: parsed.data.clientId,
          }
        : {}),
      ...(parsed.data.clientMutationId
        ? {
            clientMutationId: parsed.data.clientMutationId,
          }
        : {}),
    });

    return NextResponse.json(
      {
        ok: true,
        revision: result.revision,
        seq: result.seq,
        link: result.link,
        op: result.op,
        duplicate: result.duplicate,
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

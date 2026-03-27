import { NextResponse } from "next/server";

import { createConceptWithOperationCommand } from "@/features/concepts/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
import { createConceptRouteSchema } from "@/features/map-runtime/schemas";
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
  const parsed = await parseRouteJson(request, createConceptRouteSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await createConceptWithOperationCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary ?? null,
      description: parsed.data.description ?? null,
      x: parsed.data.x,
      y: parsed.data.y,
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
        concept: result.concept,
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
          error instanceof Error
            ? error.message
            : "Unable to create concept.",
      },
      { status: 500 }
    );
  }
}

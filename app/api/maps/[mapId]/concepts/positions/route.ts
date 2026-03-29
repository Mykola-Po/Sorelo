import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  repositionConceptsBatchCommand,
  repositionConceptWithOperationCommand,
} from "@/features/concepts/commands";
import { MapRevisionConflictError } from "@/features/maps/commands";
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
    if (parsed.data.positions.length === 1) {
      const [position] = parsed.data.positions;
      if (!position) {
        throw new Error("Position payload is empty.");
      }

      const clientId = parsed.data.clientId ?? user.id;
      const clientMutationId = parsed.data.clientMutationId ?? randomUUID();
      const result = await repositionConceptWithOperationCommand({
        workspaceId: access.workspaceId,
        actorUserId: user.id,
        mapId,
        expectedRevision: parsed.data.expectedRevision,
        conceptId: position.conceptId,
        x: position.x,
        y: position.y,
        clientId,
        clientMutationId,
      });

      return NextResponse.json({
        ok: true,
        revision: result.revision,
        seq: result.seq,
        concept: result.concept,
        concepts: [result.concept],
        op: result.op,
      });
    }

    const concepts = await repositionConceptsBatchCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      expectedRevision: parsed.data.expectedRevision,
      positions: parsed.data.positions,
    });

    return NextResponse.json({
      ok: true,
      revision: parsed.data.expectedRevision + 1,
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

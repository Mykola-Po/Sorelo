import { NextResponse } from "next/server";

import { createConceptCommand } from "@/features/concepts/commands";
import { getMapGraphMetrics } from "@/features/maps/queries";
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
    const concept = await createConceptCommand({
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary ?? null,
      description: parsed.data.description ?? null,
      x: parsed.data.x,
      y: parsed.data.y,
    });
    const metrics = await getMapGraphMetrics(mapId, access.workspaceId);

    return NextResponse.json(
      {
        ok: true,
        revision: metrics?.revision ?? 0,
        concept,
      },
      { status: 201 }
    );
  } catch (error) {
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

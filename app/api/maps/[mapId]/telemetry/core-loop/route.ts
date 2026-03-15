import { NextResponse } from "next/server";

import { recordActivity } from "@/features/activity/commands";
import { parseRouteJson, requireMapRuntimeAccess } from "@/features/map-runtime/server";
import { coreLoopTelemetryEventSchema } from "@/features/maps/core-loop-telemetry";
import { db } from "@/shared/db/client";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { mapId } = await params;
  const { user, access } = await requireMapRuntimeAccess(mapId);
  const parsed = await parseRouteJson(request, coreLoopTelemetryEventSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const { action, ...payload } = parsed.data;

    await recordActivity(db, {
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      entityType: "map",
      entityId: mapId,
      action,
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record core-loop telemetry.",
      },
      { status: 500 }
    );
  }
}

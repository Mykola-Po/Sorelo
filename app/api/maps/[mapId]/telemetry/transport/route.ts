import { NextResponse } from "next/server";

import {
  parseRouteJson,
  requireMapRuntimeAccess,
  toRuntimeRouteErrorResponse,
} from "@/features/map-runtime/server";
import { mapTransportClientTelemetryEventSchema } from "@/features/map-runtime/realtime/transport-telemetry";
import { recordMapTransportActivity } from "@/features/maps/commands";
import { db } from "@/shared/db/client";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const { user, access } = await requireMapRuntimeAccess(mapId);
    const parsed = await parseRouteJson(request, mapTransportClientTelemetryEventSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const { action, ...payload } = parsed.data;

    await recordMapTransportActivity(db, {
      workspaceId: access.workspaceId,
      actorUserId: user.id,
      mapId,
      action,
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toRuntimeRouteErrorResponse(
      error,
      "Unable to record transport telemetry."
    );
  }
}

import { NextResponse } from "next/server";

import { getFullGraphSnapshot } from "@/features/maps/queries";
import {
  requireMapRuntimeAccess,
  toRuntimeRouteErrorResponse,
} from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const { access } = await requireMapRuntimeAccess(mapId);
    const snapshot = await getFullGraphSnapshot(mapId, access.workspaceId);

    if (!snapshot) {
      return NextResponse.json({ error: "Map not found." }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    return toRuntimeRouteErrorResponse(error, "Unable to load graph snapshot.");
  }
}

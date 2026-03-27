import { NextResponse } from "next/server";

import { serializeMapGraphOperation } from "@/features/maps/commands";
import { listMapGraphOperationsAfterSeq } from "@/features/maps/queries";
import { mapGraphOpsQuerySchema } from "@/features/map-runtime/schemas";
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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const { access } = await requireMapRuntimeAccess(mapId);
    const url = new URL(request.url);
    const parsed = mapGraphOpsQuerySchema.safeParse({
      afterSeq: url.searchParams.get("afterSeq") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await listMapGraphOperationsAfterSeq({
      mapId,
      workspaceId: access.workspaceId,
      afterSeq: parsed.data.afterSeq,
      limit: parsed.data.limit,
    });

    return NextResponse.json({
      ok: true,
      revision: result.revision,
      hasMore: result.hasMore,
      ops: result.ops.map(serializeMapGraphOperation),
    });
  } catch (error) {
    return toRuntimeRouteErrorResponse(
      error,
      "Unable to load map graph operations."
    );
  }
}

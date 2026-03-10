import { NextResponse } from "next/server";

import { listConceptCatalogForMap } from "@/features/maps/queries";
import { requireMapRuntimeAccess } from "@/features/map-runtime/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { mapId } = await params;
  const { access } = await requireMapRuntimeAccess(mapId);
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q") ?? undefined;
  const concepts = await listConceptCatalogForMap(
    mapId,
    access.workspaceId,
    query ? { query } : {}
  );

  return NextResponse.json({ concepts });
}

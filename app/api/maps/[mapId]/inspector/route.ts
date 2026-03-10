import { NextResponse } from "next/server";

import { getInspectorPayload } from "@/features/maps/queries";
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
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");

  if (!kind || !id) {
    return NextResponse.json(
      { error: "kind and id query params are required." },
      { status: 400 }
    );
  }

  if (kind !== "concept" && kind !== "link") {
    return NextResponse.json({ error: "Unsupported inspector kind." }, { status: 400 });
  }

  const payload = await getInspectorPayload(mapId, access.workspaceId, {
    kind,
    id,
  });

  if (!payload) {
    return NextResponse.json({ error: "Inspector payload not found." }, { status: 404 });
  }

  return NextResponse.json(payload);
}

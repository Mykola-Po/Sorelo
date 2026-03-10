import { NextResponse } from "next/server";

import { getGraphSnapshot } from "@/features/maps/queries";
import { graphViewportSchema } from "@/features/map-runtime/schemas";
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
  const parsed = graphViewportSchema.safeParse({
    x: searchParams.get("x"),
    y: searchParams.get("y"),
    width: searchParams.get("width"),
    height: searchParams.get("height"),
    overscan: searchParams.get("overscan") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid viewport parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const snapshot = await getGraphSnapshot(mapId, access.workspaceId, parsed.data);

  if (!snapshot) {
    return NextResponse.json({ error: "Map not found." }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}

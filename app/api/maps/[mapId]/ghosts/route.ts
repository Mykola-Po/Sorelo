import { NextResponse } from "next/server";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/shared/db/client";
import { concepts } from "@/shared/db/schema";
import { requireMapRuntimeAccess } from "@/features/map-runtime/server";
import type { GraphConceptNode } from "@/features/map-runtime/types";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    mapId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { mapId } = await params;
  try {
    const { access } = await requireMapRuntimeAccess(mapId);

    // Fetch up to 10 concepts from the same workspace but NOT in this map.
    // This simulates the "Semantic Memory" without heavy OpenAI embeddings for Phase 2.
    const ghostConcepts = await db
      .select({
        id: concepts.id,
        title: concepts.title,
        conceptType: concepts.conceptType,
        summary: concepts.summary,
        description: concepts.description,
        x: concepts.x,
        y: concepts.y,
        updatedAt: concepts.updatedAt,
      })
      .from(concepts)
      .where(
        and(
          eq(concepts.workspaceId, access.workspaceId),
          ne(concepts.mapId, mapId),
          isNull(concepts.archivedAt)
        )
      )
      .orderBy(desc(concepts.updatedAt))
      .limit(10);

    const ghosts: GraphConceptNode[] = ghostConcepts.map((c) => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
      isGhost: true,
      // Give them a random spread around the center to float into view
      x: 600 + (Math.random() - 0.5) * 800,
      y: 400 + (Math.random() - 0.5) * 800,
    }));

    return NextResponse.json({ ok: true, ghosts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch ghost concepts.",
      },
      { status: 500 }
    );
  }
}

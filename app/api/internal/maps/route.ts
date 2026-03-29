import { NextResponse } from "next/server";
import { z } from "zod";

import { createMapCommand } from "@/features/maps/commands";
import { getWorkspaceBySlugForUser } from "@/features/workspace/queries";
import { assertInternalApiRequest } from "@/shared/auth/internal-api";

export const runtime = "nodejs";

const createInternalMapSchema = z.object({
  userId: z.string().uuid(),
  workspaceSlug: z.string().trim().min(2).max(64),
  title: z.string().trim().min(2).max(160),
  subjectLabel: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4_000).optional().nullable(),
});

export async function POST(request: Request) {
  const authResponse = assertInternalApiRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsed = createInternalMapSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid internal map payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const workspace = await getWorkspaceBySlugForUser(
    parsed.data.userId,
    parsed.data.workspaceSlug
  );
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  try {
    const map = await createMapCommand({
      workspaceId: workspace.id,
      actorUserId: parsed.data.userId,
      title: parsed.data.title,
      subjectLabel: parsed.data.subjectLabel,
      description: parsed.data.description ?? null,
    });

    return NextResponse.json(
      {
        data: {
          id: map.id,
          slug: map.slug,
          title: map.title,
          subjectLabel: map.subjectLabel,
          description: map.description,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create map.",
      },
      { status: 500 }
    );
  }
}

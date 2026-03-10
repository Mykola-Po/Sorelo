import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import { requireMapMembershipById } from "@/features/maps/access";
import { requireUser } from "@/shared/auth/session";

export async function requireMapRuntimeAccess(mapId: string) {
  const user = await requireUser();
  const access = await requireMapMembershipById(mapId, user.id);

  return {
    user,
    access,
  };
}

export async function parseRouteJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
) {
  type ParsedData = z.infer<TSchema>;

  try {
    const json = await request.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return {
        success: false as const,
        response: NextResponse.json(
          {
            error: "Invalid request payload.",
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true as const,
      data: parsed.data as ParsedData,
    };
  } catch {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      ),
    };
  }
}

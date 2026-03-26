import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import {
  requireActiveMapById,
  requireWorkspaceMembership,
} from "@/features/maps/access";
import { getCurrentUser } from "@/shared/auth/session";

export class RuntimeRouteError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "RuntimeRouteError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function createRuntimeRouteError(
  message: string,
  statusCode: number,
  code: string
) {
  return new RuntimeRouteError(message, statusCode, code);
}

export async function requireMapRuntimeAccess(mapId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw createRuntimeRouteError(
      "Authentication required.",
      401,
      "runtime_auth_required"
    );
  }

  let map;
  try {
    map = await requireActiveMapById(mapId);
  } catch {
    throw createRuntimeRouteError(
      "Map not found.",
      404,
      "runtime_map_not_found"
    );
  }

  let membership;
  try {
    membership = await requireWorkspaceMembership(map.workspaceId, user.id);
  } catch {
    throw createRuntimeRouteError(
      "Map access required.",
      403,
      "runtime_map_access_required"
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    access: {
      mapId: map.id,
      mapTitle: map.title,
      workspaceId: map.workspaceId,
      role: membership.role,
    },
  };
}

export function toRuntimeRouteErrorResponse(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof RuntimeRouteError) {
    return NextResponse.json(
      {
        code: error.code,
        error: error.message,
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function parseRouteJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
){
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

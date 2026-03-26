import { z } from "zod";
import { NextResponse } from "next/server";

import { assertInternalApiRequest } from "@/shared/auth/internal-api";

export function assertInternalLearningRequest(request: Request) {
  return assertInternalLearningRequestWithSecret(request);
}

export function assertInternalLearningRequestWithSecret(
  request: Request,
  secret?: string | null
) {
  return assertInternalApiRequest(request, secret);
}

export async function parseInternalJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          error: "Invalid request payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

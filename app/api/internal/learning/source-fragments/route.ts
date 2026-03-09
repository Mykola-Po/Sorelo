import { NextResponse } from "next/server";

import { createSourceFragmentCommand } from "@/features/learning/commands";
import { assertInternalLearningRequest, parseInternalJson } from "@/features/learning/internal-api";
import { sourceFragmentInputSchema } from "@/features/learning/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = assertInternalLearningRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsed = await parseInternalJson(request, sourceFragmentInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const fragment = await createSourceFragmentCommand(parsed.data);
    return NextResponse.json({ data: fragment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create source fragment.",
      },
      { status: 500 }
    );
  }
}

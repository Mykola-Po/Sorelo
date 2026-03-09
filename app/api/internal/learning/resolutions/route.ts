import { NextResponse } from "next/server";

import { resolveSuggestionCommand } from "@/features/learning/commands";
import { assertInternalLearningRequest, parseInternalJson } from "@/features/learning/internal-api";
import { suggestionResolutionInputSchema } from "@/features/learning/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = assertInternalLearningRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsed = await parseInternalJson(request, suggestionResolutionInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const resolution = await resolveSuggestionCommand(parsed.data);
    return NextResponse.json({ data: resolution }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resolve suggestion.",
      },
      { status: 500 }
    );
  }
}

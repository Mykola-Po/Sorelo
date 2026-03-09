import { NextResponse } from "next/server";

import { createSuggestionsCommand } from "@/features/learning/commands";
import { assertInternalLearningRequest, parseInternalJson } from "@/features/learning/internal-api";
import { createSuggestionsInputSchema } from "@/features/learning/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = assertInternalLearningRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsed = await parseInternalJson(request, createSuggestionsInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const suggestions = await createSuggestionsCommand(parsed.data.suggestions);
    return NextResponse.json({ data: suggestions }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create suggestions.",
      },
      { status: 500 }
    );
  }
}

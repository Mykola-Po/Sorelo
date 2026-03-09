import { NextResponse } from "next/server";

import { createSuggestionBatchCommand } from "@/features/learning/commands";
import { assertInternalLearningRequest, parseInternalJson } from "@/features/learning/internal-api";
import { suggestionBatchInputSchema } from "@/features/learning/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = assertInternalLearningRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsed = await parseInternalJson(request, suggestionBatchInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const batch = await createSuggestionBatchCommand(parsed.data);
    return NextResponse.json({ data: batch }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create suggestion batch.",
      },
      { status: 500 }
    );
  }
}

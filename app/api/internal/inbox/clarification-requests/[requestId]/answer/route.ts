import { NextResponse } from "next/server";
import { z } from "zod";

import {
  answerInboxClarificationCommand,
  isInboxCommandError,
} from "@/features/inbox/commands";
import {
  assertInternalInboxRequest,
  parseInternalInboxJson,
} from "@/features/inbox/internal-api";
import { clarificationAnswerInputSchema } from "@/features/inbox/schemas";

export const runtime = "nodejs";

const paramsSchema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const authResponse = assertInternalInboxRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid clarification request id." },
      { status: 400 }
    );
  }

  const parsedBody = await parseInternalInboxJson(
    request,
    clarificationAnswerInputSchema
  );
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const detail = await answerInboxClarificationCommand(
      parsedParams.data.requestId,
      parsedBody.data.answerText
    );

    return NextResponse.json({ data: detail });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to answer clarification request.",
      },
      { status: isInboxCommandError(error) ? error.statusCode : 500 }
    );
  }
}

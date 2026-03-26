import { NextResponse } from "next/server";
import { z } from "zod";

import {
  answerInboxClarificationCommand,
  isInboxCommandError,
} from "@/features/inbox/commands";
import {
  assertInternalInboxRequest,
  createInboxCommandErrorResponse,
  createInboxErrorResponse,
  logInboxInternalRouteEvent,
  parseInternalInboxJson,
} from "@/features/inbox/internal-api";
import { answerInboxClarificationRequestSchema } from "@/features/inbox/schemas";

export const runtime = "nodejs";

const paramsSchema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const authResult = assertInternalInboxRequest(request, "process");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { caller } = authResult;

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "validation_error",
      status: 400,
      code: "inbox_invalid_payload",
    });
    return createInboxErrorResponse({
      status: 400,
      code: "inbox_invalid_payload",
      error: "Invalid clarification request id.",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedBody = await parseInternalInboxJson(
    request,
    answerInboxClarificationRequestSchema
  );
  if (!parsedBody.success) {
    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "validation_error",
      status: parsedBody.response.status,
      code: "inbox_invalid_payload",
    });
    return parsedBody.response;
  }

  try {
    const detail = await answerInboxClarificationCommand({
      workspaceId: parsedBody.data.workspaceId,
      requestId: parsedParams.data.requestId,
      answerText: parsedBody.data.answerText,
    });

    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "success",
      status: 200,
      code: "inbox_clarification_answered",
    });

    return NextResponse.json({ data: detail });
  } catch (error) {
    const response = createInboxCommandErrorResponse(
      error,
      "Unable to answer clarification request."
    );
    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "command_error",
      status: response.status,
      code: isInboxCommandError(error) ? error.code : "inbox_unexpected_error",
    });
    return response;
  }
}

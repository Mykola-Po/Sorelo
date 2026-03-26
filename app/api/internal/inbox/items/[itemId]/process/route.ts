import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInboxCommandError,
  processInboxItemCommand,
} from "@/features/inbox/commands";
import {
  assertInternalInboxRequest,
  createInboxCommandErrorResponse,
  createInboxErrorResponse,
  logInboxInternalRouteEvent,
  parseInternalInboxJson,
} from "@/features/inbox/internal-api";
import { processInboxItemRequestSchema } from "@/features/inbox/schemas";

export const runtime = "nodejs";

const paramsSchema = z.object({
  itemId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
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
      error: "Invalid inbox item id.",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedBody = await parseInternalInboxJson(
    request,
    processInboxItemRequestSchema
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
    const detail = await processInboxItemCommand({
      workspaceId: parsedBody.data.workspaceId,
      itemId: parsedParams.data.itemId,
    });

    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "success",
      status: 200,
      code: "inbox_item_processed",
    });

    return NextResponse.json({ data: detail });
  } catch (error) {
    const response = createInboxCommandErrorResponse(
      error,
      "Unable to process inbox item."
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

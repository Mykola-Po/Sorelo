import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertInternalInboxRequest,
  createInboxErrorResponse,
  logInboxInternalRouteEvent,
} from "@/features/inbox/internal-api";
import { getInboxItemDetailQuery } from "@/features/inbox/queries";

export const runtime = "nodejs";

const requestSchema = z.object({
  itemId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const authResult = assertInternalInboxRequest(request, "process");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { caller } = authResult;

  const url = new URL(request.url);
  const parsedRequest = requestSchema.safeParse({
    ...(await context.params),
    workspaceId: url.searchParams.get("workspaceId"),
  });
  if (!parsedRequest.success) {
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
      error: "Invalid inbox item request.",
      details: parsedRequest.error.flatten(),
    });
  }

  try {
    const detail = await getInboxItemDetailQuery(parsedRequest.data);
    if (!detail) {
      logInboxInternalRouteEvent({
        channel: "process",
        caller,
        outcome: "not_found",
        status: 404,
        code: "inbox_item_not_found",
      });
      return createInboxErrorResponse({
        status: 404,
        code: "inbox_item_not_found",
        error: "Inbox item not found.",
      });
    }

    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "success",
      status: 200,
      code: "inbox_item_loaded",
    });

    return NextResponse.json({ data: detail });
  } catch {
    logInboxInternalRouteEvent({
      channel: "process",
      caller,
      outcome: "unexpected_error",
      status: 500,
      code: "inbox_unexpected_error",
    });
    return createInboxErrorResponse({
      status: 500,
      code: "inbox_unexpected_error",
      error: "Unable to load inbox item.",
    });
  }
}

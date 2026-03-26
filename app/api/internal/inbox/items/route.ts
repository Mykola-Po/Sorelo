import { NextResponse } from "next/server";

import {
  createInboxItemCommand,
  isInboxCommandError,
} from "@/features/inbox/commands";
import {
  assertInternalInboxRequest,
  createInboxCommandErrorResponse,
  logInboxInternalRouteEvent,
  parseInternalInboxJson,
} from "@/features/inbox/internal-api";
import { ingestInboxItemInputSchema } from "@/features/inbox/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = assertInternalInboxRequest(request, "create");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { caller } = authResult;

  const parsed = await parseInternalInboxJson(
    request,
    ingestInboxItemInputSchema
  );
  if (!parsed.success) {
    logInboxInternalRouteEvent({
      channel: "create",
      caller,
      outcome: "validation_error",
      status: parsed.response.status,
      code: "inbox_invalid_payload",
    });
    return parsed.response;
  }

  try {
    const result = await createInboxItemCommand(parsed.data);
    const status = result.created ? 201 : 200;
    const code = result.created ? "inbox_item_created" : "inbox_item_replayed";

    logInboxInternalRouteEvent({
      channel: "create",
      caller,
      outcome: "success",
      status,
      code,
    });

    return NextResponse.json({ data: result.item }, { status });
  } catch (error) {
    const response = createInboxCommandErrorResponse(
      error,
      "Unable to create inbox item."
    );
    logInboxInternalRouteEvent({
      channel: "create",
      caller,
      outcome: "command_error",
      status: response.status,
      code: isInboxCommandError(error) ? error.code : "inbox_unexpected_error",
    });
    return response;
  }
}

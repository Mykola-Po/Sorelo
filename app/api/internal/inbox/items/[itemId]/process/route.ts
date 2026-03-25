import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInboxCommandError,
  processInboxItemCommand,
} from "@/features/inbox/commands";
import { assertInternalInboxRequest } from "@/features/inbox/internal-api";

export const runtime = "nodejs";

const paramsSchema = z.object({
  itemId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const authResponse = assertInternalInboxRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid inbox item id." }, { status: 400 });
  }

  try {
    const detail = await processInboxItemCommand(parsedParams.data.itemId);
    return NextResponse.json({ data: detail });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process inbox item.",
      },
      { status: isInboxCommandError(error) ? error.statusCode : 500 }
    );
  }
}

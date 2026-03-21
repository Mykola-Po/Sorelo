import { NextResponse } from "next/server";

import { createInboxItemCommand } from "@/features/inbox/commands";
import {
  assertInternalInboxRequest,
  parseInternalInboxJson,
} from "@/features/inbox/internal-api";
import { ingestInboxItemInputSchema } from "@/features/inbox/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = assertInternalInboxRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const parsed = await parseInternalInboxJson(request, ingestInboxItemInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await createInboxItemCommand(parsed.data);

    return NextResponse.json(
      { data: result.item },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create inbox item.",
      },
      { status: 500 }
    );
  }
}

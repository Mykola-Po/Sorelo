import { NextResponse } from "next/server";
import { z } from "zod";

import { assertInternalInboxRequest } from "@/features/inbox/internal-api";
import { getInboxItemDetailQuery } from "@/features/inbox/queries";

export const runtime = "nodejs";

const paramsSchema = z.object({
  itemId: z.string().uuid(),
});

export async function GET(
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

  const detail = await getInboxItemDetailQuery(parsedParams.data.itemId);
  if (!detail) {
    return NextResponse.json({ error: "Inbox item not found." }, { status: 404 });
  }

  return NextResponse.json({ data: detail });
}

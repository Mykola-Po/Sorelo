import { NextResponse } from "next/server";

import { assertInternalInboxRequest } from "@/features/inbox/internal-api";
import { collectInboxRuntimeReport } from "@/features/inbox/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResponse = assertInternalInboxRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const report = await collectInboxRuntimeReport();
  return NextResponse.json(report, {
    status: report.status === "failed" ? 503 : 200,
  });
}

import { NextResponse } from "next/server";

import {
  assertInternalInboxRequest,
  logInboxInternalRouteEvent,
} from "@/features/inbox/internal-api";
import { collectInboxRuntimeReport } from "@/features/inbox/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = assertInternalInboxRequest(request, "runtime");
  if (!authResult.ok) {
    return authResult.response;
  }

  const { caller } = authResult;
  const report = await collectInboxRuntimeReport();
  const status = report.status === "failed" ? 503 : 200;

  logInboxInternalRouteEvent({
    channel: "runtime",
    caller,
    outcome: report.status,
    status,
    code:
      report.status === "failed"
        ? "inbox_runtime_report_failed"
        : report.status === "degraded"
          ? "inbox_runtime_report_degraded"
          : "inbox_runtime_report_ok",
  });

  return NextResponse.json(report, {
    status,
  });
}

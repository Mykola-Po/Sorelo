import { z } from "zod";
import { NextResponse } from "next/server";

import {
  isInboxCommandError,
  type InboxCommandErrorCode,
} from "@/features/inbox/commands";
import {
  getInternalAuthStatus,
  type InternalAuthStatus,
} from "@/shared/auth/internal";
import { env } from "@/shared/config/env";

export type InboxInternalRouteChannel = "create" | "process" | "runtime";

export type InboxInternalRequestAuthContext = {
  ok: true;
  caller: string;
  channel: InboxInternalRouteChannel;
};

export type InboxInternalRequestAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type InboxInternalRequestAuthResult =
  | InboxInternalRequestAuthContext
  | InboxInternalRequestAuthFailure;

type InboxInternalEnvKey =
  | "INBOX_INTERNAL_CREATE_SECRET"
  | "INBOX_INTERNAL_PROCESS_SECRET"
  | "INBOX_INTERNAL_RUNTIME_SECRET"
  | "INBOX_INTERNAL_CREATE_CALLERS"
  | "INBOX_INTERNAL_PROCESS_CALLERS"
  | "INBOX_INTERNAL_RUNTIME_CALLERS";

type InboxInternalAuthErrorCode =
  | "internal_auth_missing_secret"
  | "internal_auth_missing_header"
  | "internal_auth_malformed_bearer"
  | "internal_auth_invalid_token"
  | "internal_auth_missing_caller"
  | "internal_auth_forbidden_caller";

const inboxInternalSecretEnvKeys: Record<
  InboxInternalRouteChannel,
  InboxInternalEnvKey
> = {
  create: "INBOX_INTERNAL_CREATE_SECRET",
  process: "INBOX_INTERNAL_PROCESS_SECRET",
  runtime: "INBOX_INTERNAL_RUNTIME_SECRET",
};

const inboxInternalCallerEnvKeys: Record<
  InboxInternalRouteChannel,
  InboxInternalEnvKey
> = {
  create: "INBOX_INTERNAL_CREATE_CALLERS",
  process: "INBOX_INTERNAL_PROCESS_CALLERS",
  runtime: "INBOX_INTERNAL_RUNTIME_CALLERS",
};

const inboxInternalCallerDefaults: Record<
  InboxInternalRouteChannel,
  readonly string[]
> = {
  create: ["inbox-create-service"],
  process: ["inbox-process-service"],
  runtime: ["inbox-runtime-check"],
};

function readDelimitedList(value: string | undefined | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getInboxInternalSecret(channel: InboxInternalRouteChannel) {
  return env[inboxInternalSecretEnvKeys[channel]] ?? null;
}

function getInboxInternalCallers(channel: InboxInternalRouteChannel) {
  const configuredCallers = readDelimitedList(
    env[inboxInternalCallerEnvKeys[channel]] ?? null
  );

  return configuredCallers.length > 0
    ? configuredCallers
    : [...inboxInternalCallerDefaults[channel]];
}

function createInboxInternalAuthErrorResponse(input: {
  status: 401 | 403 | 503;
  code: InboxInternalAuthErrorCode;
  error: string;
}) {
  return NextResponse.json(
    {
      code: input.code,
      error: input.error,
    },
    { status: input.status }
  );
}

function createSharedInternalAuthErrorResponse(
  status: Exclude<InternalAuthStatus, "authorized">
) {
  switch (status) {
    case "missing_secret":
      return createInboxInternalAuthErrorResponse({
        status: 503,
        code: "internal_auth_missing_secret",
        error: "Internal API secret is not configured.",
      });
    case "missing_header":
      return createInboxInternalAuthErrorResponse({
        status: 401,
        code: "internal_auth_missing_header",
        error: "Missing authorization header.",
      });
    case "malformed_bearer":
      return createInboxInternalAuthErrorResponse({
        status: 401,
        code: "internal_auth_malformed_bearer",
        error: "Authorization header must use a Bearer token.",
      });
    case "invalid_token":
      return createInboxInternalAuthErrorResponse({
        status: 401,
        code: "internal_auth_invalid_token",
        error: "Unauthorized.",
      });
  }
}

function getInboxInternalCaller(request: Request) {
  const caller = request.headers.get("x-internal-caller");
  if (!caller) {
    return null;
  }

  const normalizedCaller = caller.trim();
  return normalizedCaller.length > 0 ? normalizedCaller : null;
}

export function logInboxInternalRouteEvent(input: {
  channel: InboxInternalRouteChannel;
  caller: string | null;
  outcome: string;
  status: number;
  code: string;
}) {
  console.info(
    JSON.stringify({
      event: "inbox_internal_route",
      channel: input.channel,
      caller: input.caller,
      outcome: input.outcome,
      status: input.status,
      code: input.code,
    })
  );
}

export function assertInternalInboxRequest(
  request: Request,
  channel: InboxInternalRouteChannel = "runtime"
) {
  return assertInternalInboxRequestWithChannel(request, channel);
}

export function createInboxErrorResponse(input: {
  status: number;
  code:
    | InboxCommandErrorCode
    | InboxInternalAuthErrorCode
    | "inbox_invalid_json"
    | "inbox_invalid_payload"
    | "inbox_unexpected_error";
  error: string;
  details?: ReturnType<z.ZodError["flatten"]>;
}) {
  return NextResponse.json(
    {
      code: input.code,
      error: input.error,
      ...(input.details ? { details: input.details } : {}),
    },
    { status: input.status }
  );
}

export function createInboxCommandErrorResponse(
  error: unknown,
  fallbackMessage: string
) {
  if (isInboxCommandError(error)) {
    return createInboxErrorResponse({
      status: error.statusCode,
      code: error.code,
      error: error.message,
    });
  }

  return createInboxErrorResponse({
    status: 500,
    code: "inbox_unexpected_error",
    error: fallbackMessage,
  });
}

export function assertInternalInboxRequestWithChannel(
  request: Request,
  channel: InboxInternalRouteChannel
): InboxInternalRequestAuthResult {
  const caller = getInboxInternalCaller(request);
  const authStatus = getInternalAuthStatus(
    request,
    getInboxInternalSecret(channel)
  );
  if (authStatus !== "authorized") {
    const response = createSharedInternalAuthErrorResponse(authStatus);
    const authCode =
      authStatus === "missing_secret"
        ? "internal_auth_missing_secret"
        : authStatus === "missing_header"
          ? "internal_auth_missing_header"
          : authStatus === "malformed_bearer"
            ? "internal_auth_malformed_bearer"
            : "internal_auth_invalid_token";
    logInboxInternalRouteEvent({
      channel,
      caller,
      outcome: "auth_failed",
      status: response.status,
      code: authCode,
    });
    return {
      ok: false,
      response,
    };
  }

  if (!caller) {
    const response = createInboxInternalAuthErrorResponse({
      status: 401,
      code: "internal_auth_missing_caller",
      error: "Missing internal caller header.",
    });
    logInboxInternalRouteEvent({
      channel,
      caller: null,
      outcome: "auth_failed",
      status: response.status,
      code: "internal_auth_missing_caller",
    });
    return {
      ok: false,
      response,
    };
  }

  const allowedCallers = getInboxInternalCallers(channel);
  if (!allowedCallers.includes(caller)) {
    const response = createInboxInternalAuthErrorResponse({
      status: 403,
      code: "internal_auth_forbidden_caller",
      error: "Internal caller is not allowed for this route.",
    });
    logInboxInternalRouteEvent({
      channel,
      caller,
      outcome: "auth_failed",
      status: response.status,
      code: "internal_auth_forbidden_caller",
    });
    return {
      ok: false,
      response,
    };
  }

  return {
    ok: true,
    caller,
    channel,
  };
}

export async function parseInternalInboxJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      success: false as const,
      response: createInboxErrorResponse({
        status: 400,
        code: "inbox_invalid_json",
        error: "Invalid JSON body.",
      }),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false as const,
      response: createInboxErrorResponse({
        status: 400,
        code: "inbox_invalid_payload",
        error: "Invalid request payload.",
        details: parsed.error.flatten(),
      }),
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

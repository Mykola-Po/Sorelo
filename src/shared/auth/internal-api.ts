import { NextResponse } from "next/server";

import {
  getInternalAuthStatus,
  type InternalAuthStatus,
} from "@/shared/auth/internal";

export type InternalAuthErrorCode =
  | "internal_auth_missing_secret"
  | "internal_auth_missing_header"
  | "internal_auth_malformed_bearer"
  | "internal_auth_invalid_token";

type InternalAuthFailurePayload = {
  code: InternalAuthErrorCode;
  error: string;
};

function getInternalAuthFailurePayload(
  status: Exclude<InternalAuthStatus, "authorized">
): {
  httpStatus: 401 | 503;
  payload: InternalAuthFailurePayload;
} {
  switch (status) {
    case "missing_secret":
      return {
        httpStatus: 503,
        payload: {
          code: "internal_auth_missing_secret",
          error: "Internal API secret is not configured.",
        },
      };
    case "missing_header":
      return {
        httpStatus: 401,
        payload: {
          code: "internal_auth_missing_header",
          error: "Missing authorization header.",
        },
      };
    case "malformed_bearer":
      return {
        httpStatus: 401,
        payload: {
          code: "internal_auth_malformed_bearer",
          error: "Authorization header must use a Bearer token.",
        },
      };
    case "invalid_token":
      return {
        httpStatus: 401,
        payload: {
          code: "internal_auth_invalid_token",
          error: "Unauthorized.",
        },
      };
  }
}

export function assertInternalApiRequest(
  request: Request,
  secret?: string | null
) {
  const status = getInternalAuthStatus(request, secret);
  if (status === "authorized") {
    return null;
  }

  const failure = getInternalAuthFailurePayload(status);
  return NextResponse.json(failure.payload, {
    status: failure.httpStatus,
  });
}

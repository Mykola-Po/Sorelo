export type AppOriginHeaders = {
  origin?: string | null;
  host?: string | null;
  xForwardedHost?: string | null;
  xForwardedProto?: string | null;
};

function normalizeOrigin(candidate: string | null | undefined) {
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export function resolveAppOrigin(
  headers: AppOriginHeaders,
  fallbackOrigin: string
) {
  const directOrigin = normalizeOrigin(headers.origin);
  if (directOrigin) {
    return directOrigin;
  }

  const host = headers.xForwardedHost?.trim() || headers.host?.trim();
  if (host) {
    const forwardedProto = headers.xForwardedProto?.split(",")[0]?.trim();
    const fallbackProtocol = normalizeOrigin(fallbackOrigin)
      ? new URL(fallbackOrigin).protocol.replace(":", "")
      : "http";
    const protocol = forwardedProto || fallbackProtocol;

    return `${protocol}://${host}`;
  }

  return fallbackOrigin;
}

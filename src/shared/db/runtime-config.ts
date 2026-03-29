type ParsedDatabaseUrl = {
  hostname: string;
  port: string;
};

function parseDatabaseUrl(databaseUrl: string): ParsedDatabaseUrl | null {
  try {
    const url = new URL(databaseUrl);
    return {
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    return null;
  }
}

export function resolveRuntimeDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");
    const isSessionModePort = url.port === "5432";

    if (isSupabasePooler && isSessionModePort) {
      url.port = "6543";
      return url.toString();
    }

    return databaseUrl;
  } catch {
    return databaseUrl;
  }
}

export function resolveRuntimeDatabasePoolSize(databaseUrl: string) {
  const parsedUrl = parseDatabaseUrl(databaseUrl);

  if (!parsedUrl) {
    return 5;
  }

  return parsedUrl.hostname.endsWith(".pooler.supabase.com") ? 1 : 5;
}

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const dotenvFiles = [".env.local", ".env"];

function readDotenvValue(name) {
  for (const fileName of dotenvFiles) {
    const filePath = path.join(process.cwd(), fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (key !== name) {
        continue;
      }

      return trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  }

  return null;
}

function readSetting(name) {
  return process.env[name] ?? readDotenvValue(name);
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function readAllowedBaseUrls() {
  const raw = readSetting("INBOX_RUNTIME_ALLOWED_BASE_URLS");
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function fail(message, details) {
  console.error(message);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

const baseUrl = readArgument("--base-url") ?? readSetting("NEXT_PUBLIC_APP_URL");
if (!baseUrl) {
  fail("NEXT_PUBLIC_APP_URL or --base-url is required.");
}

let parsedBaseUrl;
try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  fail(`Invalid base URL: ${baseUrl}`);
}

const allowRemote = hasFlag("--allow-remote");
const allowedBaseUrls = readAllowedBaseUrls();
const isAllowedRemoteBaseUrl = allowedBaseUrls.includes(parsedBaseUrl.origin);
const caller =
  readArgument("--caller") ??
  readSetting("INBOX_INTERNAL_RUNTIME_CALLER") ??
  "inbox-runtime-check";

if (!isLoopbackHost(parsedBaseUrl.hostname) && !allowRemote && !isAllowedRemoteBaseUrl) {
  fail(
    `Refusing to run Inbox runtime check against non-loopback base URL ${parsedBaseUrl.origin}.`,
    {
      hint:
        "Pass --allow-remote and set INBOX_RUNTIME_ALLOWED_BASE_URLS when you intentionally need a remote target.",
    }
  );
}

const internalSecret = readSetting("INBOX_INTERNAL_RUNTIME_SECRET");
if (!internalSecret) {
  fail("INBOX_INTERNAL_RUNTIME_SECRET is required for Inbox runtime checks.");
}

const endpoint = new URL("/api/internal/inbox/runtime", baseUrl);
const response = await fetch(endpoint, {
  headers: {
    authorization: `Bearer ${internalSecret}`,
    "x-internal-caller": caller,
  },
});

const responseText = await response.text();
let payload = null;

try {
  payload = responseText ? JSON.parse(responseText) : null;
} catch {
  payload = responseText;
}

if (!response.ok && !(response.status === 503 && payload?.status === "failed")) {
  fail(`Inbox runtime check request failed with status ${response.status}.`, {
    status: payload?.status ?? null,
    generatedAt: payload?.generatedAt ?? null,
  });
}

console.log(
  JSON.stringify(
    {
      status: payload?.status ?? (response.ok ? "ok" : "failed"),
      generatedAt: payload?.generatedAt ?? null,
      checks: payload?.checks ?? [],
    },
    null,
    2
  )
);

if (payload?.status === "failed") {
  process.exit(1);
}

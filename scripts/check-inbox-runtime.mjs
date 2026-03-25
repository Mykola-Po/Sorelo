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

const internalSecret = readSetting("INTERNAL_API_SECRET");
if (!internalSecret) {
  fail("INTERNAL_API_SECRET is required for Inbox runtime checks.");
}

const endpoint = new URL("/api/internal/inbox/runtime", baseUrl);
const response = await fetch(endpoint, {
  headers: {
    authorization: `Bearer ${internalSecret}`,
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
  fail(`Inbox runtime check request failed with status ${response.status}.`, payload);
}

console.log(JSON.stringify(payload, null, 2));

if (payload?.status === "failed") {
  process.exit(1);
}

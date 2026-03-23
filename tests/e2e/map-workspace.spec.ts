import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type InternalResponse<T> = {
  data: T;
};

function readDotenvValue(name: string) {
  const dotenvPath = join(process.cwd(), ".env.local");
  if (!existsSync(dotenvPath)) {
    return null;
  }

  const lines = readFileSync(dotenvPath, "utf8").split(/\r?\n/);
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

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    return rawValue.replace(/^['"]|['"]$/g, "");
  }

  return null;
}

function getInternalApiSecret() {
  const secret =
    process.env.INTERNAL_API_SECRET ?? readDotenvValue("INTERNAL_API_SECRET");

  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is required for internal e2e requests.");
  }

  return secret;
}

function normalizeWorkspaceSlug(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || "workspace";
}

async function authenticateAsE2EUser(page: Page, userId: string) {
  await page.goto("/");
  const appOrigin = new URL(page.url()).origin;

  await page.context().addCookies([
    {
      name: "sorela-e2e-auth",
      value: "1",
      url: appOrigin,
    },
    {
      name: "sorela-e2e-auth-user",
      value: userId,
      url: appOrigin,
    },
  ]);
}

async function createMapThroughInternalApi(
  page: Page,
  input: {
    userId: string;
    workspaceSlug: string;
    title: string;
    subjectLabel: string;
    description: string;
  }
) {
  const response = await page.request.post("/api/internal/maps", {
    headers: {
      authorization: `Bearer ${getInternalApiSecret()}`,
    },
    data: input,
  });

  if (!response.ok()) {
    throw new Error(
      `Internal map request failed (${response.status()}): ${await response.text()}`
    );
  }

  return (await response.json()) as InternalResponse<{ id: string }>;
}

async function createWorkspaceAndOpenMap(page: Page) {
  const suffix = `${Date.now()}`;
  const userId = randomUUID();
  const workspaceName = `Canvas Workspace ${suffix}`;
  const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

  await authenticateAsE2EUser(page, userId);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/new-workspace$/);

  await page.locator('input[name="name"]').fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
    timeout: 30_000,
  });

  const map = await createMapThroughInternalApi(page, {
    userId,
    workspaceSlug,
    title: `Canvas Map ${suffix}`,
    subjectLabel: "Alex",
    description: "Map used to verify canvas interactions while the Inspector is open.",
  });
  await page.goto(`/app/${workspaceSlug}/maps/${map.data.id}`);

  await expect(page.locator(".map-screen").first()).toBeVisible();
}

test.describe("Map workspace canvas interactions", () => {
  test("place concept mode still allows clicking the canvas while the Inspector is open", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await createWorkspaceAndOpenMap(page);

    await page
      .locator(".map-bottom-dock")
      .getByRole("button", { name: "New Concept" })
      .click();
    await expect(
      page.getByText("Click on the canvas to place the Concept")
    ).toBeVisible();

    await page.locator(".map-canvas-layer").click({
      position: { x: 180, y: 180 },
    });

    await expect(page.getByRole("heading", { name: "New Concept" })).toBeVisible();
    await expect(page.getByText("Position:")).toBeVisible();
    await expect(
      page.locator('input[name="title"]')
    ).toBeVisible();
  });
});

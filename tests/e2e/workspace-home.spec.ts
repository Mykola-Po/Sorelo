import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
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
    throw new Error(
      "INTERNAL_API_SECRET is required for internal map e2e requests."
    );
  }

  return secret;
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
    {
      name: "sorelo-locale",
      value: "en",
      url: appOrigin,
    },
  ]);
}

test.describe("workspace home", () => {
  test("keeps the next step and solid progress visible", async ({ page }) => {
    test.setTimeout(120_000);

    const suffix = `${Date.now()}`;
    const userId = randomUUID();
    const workspaceName = `Signal Workspace ${suffix}`;
    const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

    await authenticateAsE2EUser(page, userId);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/new-workspace$/);

    const workspaceNameField = page.getByLabel("Workspace name");
    await expect(workspaceNameField).toBeVisible();
    await workspaceNameField.fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: workspaceName })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Create the first Map" })
    ).toBeVisible();
    await expect(page.getByText("Solid progress")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "First useful session" })
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Workspace sections" })
    ).toBeVisible();
    await page.getByRole("link", { name: "Inbox" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/inbox$`), {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await page.getByRole("link", { name: "Overview" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: workspaceName })
    ).toBeVisible();

    const map = await createMapThroughInternalApi(page, {
      userId,
      workspaceSlug,
      title: `Signal Map ${suffix}`,
      subjectLabel: "Alex",
      description:
        "Track the explainable structure before the first Scenario run.",
    });
    await page.goto(`/app/${workspaceSlug}/maps/${map.data.id}`);

    await page.goto(`/app/${workspaceSlug}`);
    await expect(
      page.getByRole("heading", { name: "Place the first Concept" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Map library" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent Scenario signal" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Map" }).first()
    ).toBeVisible();
  });
});

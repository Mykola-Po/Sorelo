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

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => {
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;

    return {
      innerWidth: window.innerWidth,
      scrollWidth: scrollingElement.scrollWidth,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
}

async function expectNoBackdropBlur(page: Page, selector: string) {
  const backdropFilters = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const value = window.getComputedStyle(element).backdropFilter;
      return value && value !== "none" ? value : "none";
    })
  );

  expect(backdropFilters.every((value) => value === "none")).toBeTruthy();
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
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible();
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

  test("keeps the authenticated shell and workspace hierarchy clear on desktop", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const suffix = `${Date.now()}`;
    const userId = randomUUID();
    const workspaceName = `Hierarchy Workspace ${suffix}`;
    const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

    await authenticateAsE2EUser(page, userId);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/new-workspace$/);

    await page.getByLabel("Workspace name").fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
      timeout: 30_000,
    });

    const topbar = page.locator(".product-topbar");
    const heroPanel = page.locator(".sl-workspace-hero-panel");
    const focusCard = page.locator(".sl-workspace-focus-card");
    const metricCards = page.locator(".sl-workspace-metric-card");

    await expect(topbar).toBeVisible();
    await expect(heroPanel).toBeVisible();
    await expect(focusCard).toBeVisible();
    await expect(metricCards).toHaveCount(5);

    const [heroBox, focusBox] = await Promise.all([
      heroPanel.boundingBox(),
      focusCard.boundingBox(),
    ]);

    expect(heroBox).not.toBeNull();
    expect(focusBox).not.toBeNull();

    if (!heroBox || !focusBox) {
      return;
    }

    expect(Math.abs(heroBox.y - focusBox.y)).toBeLessThan(40);
    expect(heroBox.width).toBeGreaterThan(focusBox.width);

    await expectNoBackdropBlur(
      page,
      ".product-topbar, .sl-workspace-hero-panel, .sl-workspace-focus-card"
    );
  });
});

test.describe("workspace home mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("stacks hero, focus, and navigation cleanly on mobile", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const suffix = `${Date.now()}`;
    const userId = randomUUID();
    const workspaceName = `Mobile Workspace ${suffix}`;
    const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

    await authenticateAsE2EUser(page, userId);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/new-workspace$/);

    await page.getByLabel("Workspace name").fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
      timeout: 30_000,
    });

    const topbar = page.locator(".product-topbar");
    const nav = page.getByRole("navigation", { name: "Workspace sections" });
    const heroPanel = page.locator(".sl-workspace-hero-panel");
    const focusCard = page.locator(".sl-workspace-focus-card");

    await expect(topbar).toBeVisible();
    await expect(nav).toBeVisible();
    await expect(heroPanel).toBeVisible();
    await expect(focusCard).toBeVisible();

    const [heroBox, focusBox] = await Promise.all([
      heroPanel.boundingBox(),
      focusCard.boundingBox(),
    ]);

    expect(heroBox).not.toBeNull();
    expect(focusBox).not.toBeNull();

    if (!heroBox || !focusBox) {
      return;
    }

    expect(focusBox.y).toBeGreaterThan(heroBox.y + heroBox.height - 4);
    await expectNoHorizontalOverflow(page);
    await expectNoBackdropBlur(
      page,
      ".product-topbar, .sl-workspace-hero-panel, .sl-workspace-focus-card"
    );
  });
});

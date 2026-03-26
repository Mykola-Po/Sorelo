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
    throw new Error(
      "INTERNAL_API_SECRET is required for internal e2e requests."
    );
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

  const workspaceNameField = page.getByLabel("Workspace name");
  await expect(workspaceNameField).toBeVisible();
  await workspaceNameField.fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
    timeout: 30_000,
  });

  const map = await createMapThroughInternalApi(page, {
    userId,
    workspaceSlug,
    title: `Canvas Map ${suffix}`,
    subjectLabel: "Alex",
    description:
      "Map used to verify canvas interactions while the Inspector is open.",
  });
  await page.goto(`/app/${workspaceSlug}/maps/${map.data.id}`);

  await expect(page.locator(".map-screen").first()).toBeVisible();

  return {
    mapId: map.data.id,
    workspaceSlug,
  };
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

async function createConceptThroughUi(
  page: Page,
  input: { title: string; position: { x: number; y: number } }
) {
  const dismissButton = page
    .locator(".map-overlay-dialog, .map-mobile-dialog")
    .getByRole("button", { name: "Cancel" })
    .first();

  if (await dismissButton.isVisible().catch(() => false)) {
    await dismissButton.click();
  }

  await page
    .locator(".map-bottom-dock")
    .getByRole("button", { name: "New Concept" })
    .click();
  await page.locator(".map-canvas-layer").click({
    position: input.position,
  });

  await page.getByLabel("Title").fill(input.title);
  await page.getByRole("button", { name: "Create Concept" }).click();
  await expect(page.getByRole("button", { name: new RegExp(input.title) })).toBeVisible({
    timeout: 30_000,
  });
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

    await expect(
      page.getByRole("heading", { name: "New Concept" })
    ).toBeVisible();
    await expect(page.getByText("Position:")).toBeVisible();
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
    await expect(page.getByLabel("Concept type")).toBeVisible();
  });

  test("existing concepts stay visible after reload and inspector reads do not 500", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const { mapId } = await createWorkspaceAndOpenMap(page);
    const failingRuntimeReads: Array<{ url: string; status: number }> = [];
    page.on("response", (response) => {
      if (!response.url().includes(`/api/maps/${mapId}/`)) {
        return;
      }

      if (
        (response.url().includes("/graph") ||
          response.url().includes("/inspector")) &&
        response.status() >= 500
      ) {
        failingRuntimeReads.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page
      .locator(".map-bottom-dock")
      .getByRole("button", { name: "New Concept" })
      .click();
    await page.locator(".map-canvas-layer").click({
      position: { x: 220, y: 220 },
    });

    await page.getByLabel("Title").fill("Stable Node");
    await page.getByRole("button", { name: "Create Concept" }).click();
    await expect(page.getByRole("button", { name: /Stable Node/ })).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(page.locator(".map-screen").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Stable Node/ })).toBeVisible({
      timeout: 30_000,
    });

    const inspectorResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes(`/api/maps/${mapId}/inspector`) &&
        response.url().includes("kind=concept") &&
        response.status() === 200
      );
    });

    await page.getByRole("button", { name: /Stable Node/ }).click();
    await inspectorResponsePromise;
    await expect(page.getByRole("heading", { name: "Stable Node" })).toBeVisible({
      timeout: 30_000,
    });
    expect(failingRuntimeReads).toEqual([]);
  });

  test("keeps top strip, selected state, and panel dominance readable on desktop", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await createWorkspaceAndOpenMap(page);

    const topStrip = page.locator(".map-top-strip").first();
    const dock = page.locator(".map-bottom-dock").first();
    const dialog = page.locator(".map-overlay-dialog");

    await expect(topStrip).toBeVisible();
    await expect(dock).toBeVisible();
    await expect(dialog).toBeVisible();

    const [topStripBox, dockBox, dialogBox] = await Promise.all([
      topStrip.boundingBox(),
      dock.boundingBox(),
      dialog.boundingBox(),
    ]);

    expect(topStripBox).not.toBeNull();
    expect(dockBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();

    if (!topStripBox || !dockBox || !dialogBox) {
      return;
    }

    expect(dialogBox.x).toBeGreaterThan(topStripBox.x + topStripBox.width * 0.55);
    expect(dialogBox.height).toBeGreaterThan(dockBox.height * 3);

    await createConceptThroughUi(page, {
      title: "Signal Node",
      position: { x: 220, y: 220 },
    });

    await expect(
      page.locator('.sl-concept-card[data-selected="true"]').filter({
        hasText: "Signal Node",
      })
    ).toHaveCount(1);
    await expect(page.locator(".map-top-strip").first()).toContainText("Signal Node");

    await expectNoHorizontalOverflow(page);
    await expectNoBackdropBlur(
      page,
      ".map-top-strip, .map-bottom-dock-group, .map-overlay-dialog"
    );
  });
});

test.describe("Map workspace mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("keeps mobile panel dominance and selected state readable", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await createWorkspaceAndOpenMap(page);

    const topStrip = page.locator(".map-top-strip").first();
    const dock = page.locator(".map-bottom-dock").first();
    const dialog = page.locator(".map-mobile-dialog");

    await expect(topStrip).toBeVisible();
    await expect(dock).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.locator(".map-overlay-dialog")).toHaveCount(0);

    await createConceptThroughUi(page, {
      title: "Pocket Node",
      position: { x: 180, y: 220 },
    });

    const [dockBox, dialogBox] = await Promise.all([
      dock.boundingBox(),
      dialog.boundingBox(),
    ]);

    expect(dockBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();

    if (!dockBox || !dialogBox) {
      return;
    }

    expect(dialogBox.height).toBeGreaterThan(dockBox.height * 3);
    await expect(
      page.locator('.sl-concept-card[data-selected="true"]').filter({
        hasText: "Pocket Node",
      })
    ).toHaveCount(1);
    await expect(page.locator(".map-top-strip").first()).toContainText("Pocket Node");

    await expectNoHorizontalOverflow(page);
    await expectNoBackdropBlur(
      page,
      ".map-top-strip, .map-bottom-dock-group, .map-mobile-dialog"
    );
  });
});

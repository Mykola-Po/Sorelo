import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

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

async function createWorkspaceAndOpenMap(page: Page) {
  const suffix = `${Date.now()}`;
  const workspaceName = `Canvas Workspace ${suffix}`;
  const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

  await authenticateAsE2EUser(page, randomUUID());
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/new-workspace$/);

  await page.locator('input[name="name"]').fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
    timeout: 30_000,
  });

  await page.locator('input[name="title"]').fill(`Canvas Map ${suffix}`);
  await page.locator('input[name="subjectLabel"]').fill("Alex");
  await page
    .locator('textarea[name="description"]')
    .fill("Map used to verify canvas interactions while the Inspector is open.");
  await page.getByRole("button", { name: "Create map" }).click();

  try {
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/maps/[^/]+$`), {
      timeout: 10_000,
    });
  } catch {
    await page.reload();
    await page.getByRole("link", { name: "Open map" }).first().click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/maps/[^/]+$`), {
      timeout: 30_000,
    });
  }

  await expect(page.locator(".map-screen")).toBeVisible();
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

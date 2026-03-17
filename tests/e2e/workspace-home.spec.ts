import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

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
    const workspaceName = `Signal Workspace ${suffix}`;
    const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

    await authenticateAsE2EUser(page, randomUUID());
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/new-workspace$/);

    await page.locator('input[name="name"]').fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: workspaceName })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create the first Map" })
    ).toBeVisible();
    await expect(page.getByText("Solid progress")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "First useful session" })
    ).toBeVisible();

    await page.locator('input[name="title"]').fill(`Signal Map ${suffix}`);
    await page.locator('input[name="subjectLabel"]').fill("Alex");
    await page
      .locator('textarea[name="description"]')
      .fill("Track the explainable structure before the first Scenario run.");
    await page.getByRole("button", { name: "Create map" }).click();

    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/maps/[^/]+$`), {
      timeout: 30_000,
    });

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
    await expect(page.getByRole("link", { name: "Open Map" }).first()).toBeVisible();
  });
});

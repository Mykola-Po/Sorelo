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

async function createWorkspace(page: Page, userId: string) {
  const suffix = `${Date.now()}`;
  const workspaceName = `Map Creation Workspace ${suffix}`;
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
  await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible({
    timeout: 15_000,
  });

  return { workspaceSlug };
}

async function openCreatedMapFromWorkspaceHome(
  page: Page,
  workspaceSlug: string
) {
  const mapUrlPattern = new RegExp(`/app/${workspaceSlug}/maps/[^/]+$`);

  try {
    await page.waitForURL(mapUrlPattern, {
      timeout: 30_000,
    });
  } catch {
    await page.reload();
    const openMapLink = page.getByRole("link", { name: "Open Map" }).first();
    await expect(openMapLink).toBeVisible({ timeout: 30_000 });
    await openMapLink.click();
    await page.waitForURL(mapUrlPattern, {
      timeout: 30_000,
    });
  }

  await expect(page.locator(".map-screen").first()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Map creation UI", () => {
  test("creates a Map from workspace home and surfaces it in the workspace library", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const userId = randomUUID();
    const suffix = `${Date.now()}`;
    const mapTitle = `Conflict reactions ${suffix}`;
    const subjectLabel = "Alex";
    const description =
      "Explain how criticism escalates from trigger to defensive reaction.";

    const { workspaceSlug } = await createWorkspace(page, userId);

    await expect(
      page.getByRole("heading", { name: "Create the first Map" })
    ).toBeVisible();

    const mapTitleField = page.getByLabel("Map title");
    const subjectLabelField = page.getByLabel("Subject label");
    const descriptionField = page.getByLabel("Description");

    await expect(mapTitleField).toBeVisible();
    await expect(subjectLabelField).toBeVisible();
    await expect(descriptionField).toBeVisible();
    await expect(
      mapTitleField.evaluate(
        (element) => (element as HTMLInputElement).labels?.length ?? 0
      )
    ).resolves.toBe(1);
    await expect(
      descriptionField.evaluate(
        (element) => (element as HTMLTextAreaElement).labels?.length ?? 0
      )
    ).resolves.toBe(1);

    await mapTitleField.fill("A");
    await subjectLabelField.fill(subjectLabel);
    await page.getByRole("button", { name: "Create map" }).click();

    await expect(mapTitleField).toHaveAttribute("aria-invalid", "true");
    const describedBy = await mapTitleField.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    for (const id of describedBy?.split(/\s+/).filter(Boolean) ?? []) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    await mapTitleField.fill(mapTitle);
    await subjectLabelField.fill(subjectLabel);
    await descriptionField.fill(description);
    await page.getByRole("button", { name: "Create map" }).click();

    await openCreatedMapFromWorkspaceHome(page, workspaceSlug);

    await page.goto(`/app/${workspaceSlug}`);
    await expect(
      page.getByRole("heading", { name: "Place the first Concept" })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(mapTitle).first()).toBeVisible();
    await expect(page.getByText(subjectLabel).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Map" }).first()
    ).toBeVisible();
  });
});

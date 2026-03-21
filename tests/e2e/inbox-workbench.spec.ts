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

async function createWorkspace(page: Page) {
  const suffix = `${Date.now()}`;
  const workspaceName = `Inbox Workspace ${suffix}`;
  const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

  await authenticateAsE2EUser(page, randomUUID());
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/new-workspace$/);

  await page.locator('input[name="name"]').fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
    timeout: 30_000,
  });

  return { workspaceSlug };
}

test.describe("Inbox workbench", () => {
  test("creates, processes, clarifies, and reruns an inbox item through the UI", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const { workspaceSlug } = await createWorkspace(page);
    const rawText =
      "Public criticism from close people causes withdrawal and a defensive reaction. What exactly triggers the reaction first? We need to know who is involved before promotion.";
    const answerText =
      "The reaction starts when the criticism comes from a close partner in front of other people.";

    await page.goto(`/app/${workspaceSlug}/inbox`);
    await expect(
      page.getByRole("heading", { name: "Inbox Workbench" })
    ).toBeVisible();

    await page.locator('textarea[name="rawText"]').fill(rawText);
    await page.getByRole("button", { name: "Create inbox item" }).click();

    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/inbox\\?item=`), {
      timeout: 30_000,
    });
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(rawText);

    await page.getByRole("button", { name: "Process item" }).click();

    await expect(
      page.getByText("Answer the pending clarification")
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "clarification requested"
    );

    await page.locator('textarea[name="answerText"]').fill(answerText);
    await page
      .getByRole("button", { name: "Submit clarification answer" })
      .click();

    await expect(
      page.getByRole("button", { name: "Submit clarification answer" })
    ).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "answered"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(answerText);
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "Clarification answer fragments"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "clarification answer"
    );
    await expect
      .poll(async () => {
        const text = await page.locator(".sl-inbox-detail-stack").textContent();
        return /parked|promoted|discarded/.test(text ?? "");
      })
      .toBe(true);
  });
});

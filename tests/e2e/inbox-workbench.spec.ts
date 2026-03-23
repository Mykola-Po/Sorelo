import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type InternalResponse<T> = {
  data: T;
};

type InboxItemDetail = {
  item: {
    status: string;
  };
  clarificationRequests: Array<{
    id: string;
    status: string;
  }>;
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
      "INTERNAL_API_SECRET is required for internal inbox e2e requests."
    );
  }

  return secret;
}

async function postInternalInbox<T>(page: Page, path: string, payload?: object) {
  const response =
    payload === undefined
      ? await page.request.post(path, {
          headers: {
            authorization: `Bearer ${getInternalApiSecret()}`,
          },
        })
      : await page.request.post(path, {
          headers: {
            authorization: `Bearer ${getInternalApiSecret()}`,
          },
          data: payload,
        });

  if (!response.ok()) {
    throw new Error(
      `Internal inbox request failed (${response.status()}): ${await response.text()}`
    );
  }

  return (await response.json()) as InternalResponse<T>;
}

async function getInternalInbox<T>(page: Page, path: string) {
  const response = await page.request.get(path, {
    headers: {
      authorization: `Bearer ${getInternalApiSecret()}`,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Internal inbox request failed (${response.status()}): ${await response.text()}`
    );
  }

  return (await response.json()) as InternalResponse<T>;
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
  ]);
}

async function createWorkspace(page: Page, userId: string) {
  const suffix = `${Date.now()}`;
  const workspaceName = `Inbox Workspace ${suffix}`;
  const workspaceSlug = normalizeWorkspaceSlug(workspaceName);

  await authenticateAsE2EUser(page, userId);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/new-workspace$/);

  await page.locator('input[name="name"]').fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
    timeout: 30_000,
  });

  return { workspaceSlug };
}

async function createMap(page: Page, userId: string, workspaceSlug: string) {
  const suffix = `${Date.now()}`;
  const response = await createMapThroughInternalApi(page, {
    userId,
    workspaceSlug,
    title: `Inbox Map ${suffix}`,
    subjectLabel: "Alex",
    description: "Map for Inbox promote flow.",
  });

  return { mapId: response.data.id };
}

test.describe("Inbox workbench", () => {
  test("creates an inbox item and shows clarification plus rerun state in the UI", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const userId = randomUUID();
    const { workspaceSlug } = await createWorkspace(page, userId);
    await createMap(page, userId, workspaceSlug);
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
    const [, itemId = ""] = page.url().match(/[?&]item=([^&#]+)/) ?? [];
    expect(itemId).not.toBe("");
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(rawText);
    await expect(
      page.getByRole("button", { name: "Process item" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Process item" }).click();

    let clarificationRequestId = "";
    await expect
      .poll(async () => {
        try {
          const response = await getInternalInbox<InboxItemDetail>(
            page,
            `/api/internal/inbox/items/${itemId}`
          );
          clarificationRequestId =
            response.data.clarificationRequests.find(
              (request) => request.status === "pending"
            )?.id ?? "";

          return clarificationRequestId || null;
        } catch {
          return null;
        }
      }, {
        timeout: 30_000,
        intervals: [1_000, 2_000],
      })
      .toEqual(expect.any(String));

    await page.reload();

    await expect(
      page.getByText("Answer the pending clarification")
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Execution attempts" })
    ).toBeVisible();
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "attempt 2"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "manual process"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "persist_raw"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "Runtime"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "clarification requested"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "inbox-routing.v1"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "A single clarification is likely to change the routing outcome more than it costs the user."
    );

    await postInternalInbox(
      page,
      `/api/internal/inbox/clarification-requests/${clarificationRequestId}/answer`,
      {
        answerText,
      }
    );

    await expect
      .poll(async () => {
        try {
          const response = await getInternalInbox<InboxItemDetail>(
            page,
            `/api/internal/inbox/items/${itemId}`
          );
          return response.data.item.status;
        } catch {
          return "";
        }
      }, {
        timeout: 60_000,
        intervals: [1_000, 2_000, 3_000],
      })
      .toMatch(/ready_for_review|applied|parked|discarded/);

    await page.reload();

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
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "attempt 3"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "clarification rerun"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText("route");
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "Route reason"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      "Policy notes"
    );
    await expect(page.locator(".sl-inbox-detail-stack")).toContainText(
      /The signal is strong enough to emit a structured packet without forcing extra clarification.|The packet is preserved for review because it does not compile into deterministic canonical mutations yet.|Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.|The signal should be preserved, but the current evidence is too weak for a hard structured promotion.|The signal is too weak to keep, and clarification would not improve the expected outcome enough./
    );
    await expect
      .poll(async () => {
        const text = await page.locator(".sl-inbox-detail-stack").textContent();
        return /ready for review|applied|parked|discarded/.test(text ?? "");
      })
      .toBe(true);
  });
});

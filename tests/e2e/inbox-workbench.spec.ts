import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

type InternalResponse<T> = {
  data: T;
};

type InternalErrorResponse = {
  code: string;
  error: string;
};

type InboxChannel = "create" | "process";

let sqlClient: postgres.Sql | null = null;

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

function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_URL ?? readDotenvValue("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for inbox e2e database lookups.");
  }

  return databaseUrl;
}

function getSqlClient() {
  sqlClient ??= postgres(getDatabaseUrl(), {
    prepare: false,
    max: 1,
  });

  return sqlClient;
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

function getInboxInternalSecret(channel: InboxChannel) {
  const envName =
    channel === "create"
      ? "INBOX_INTERNAL_CREATE_SECRET"
      : "INBOX_INTERNAL_PROCESS_SECRET";
  const secret = process.env[envName] ?? readDotenvValue(envName);

  if (!secret) {
    throw new Error(`${envName} is required for internal inbox e2e requests.`);
  }

  return secret;
}

function hasInboxInternalSecret(channel: InboxChannel) {
  const envName =
    channel === "create"
      ? "INBOX_INTERNAL_CREATE_SECRET"
      : "INBOX_INTERNAL_PROCESS_SECRET";

  return Boolean(process.env[envName] ?? readDotenvValue(envName));
}

function getInboxInternalCaller(channel: InboxChannel) {
  return channel === "create"
    ? "inbox-create-service"
    : "inbox-process-service";
}

function getInboxInternalHeaders(channel: InboxChannel) {
  return {
    authorization: `Bearer ${getInboxInternalSecret(channel)}`,
    "x-internal-caller": getInboxInternalCaller(channel),
  };
}

async function postInternalInbox<T>(
  page: Page,
  path: string,
  payload?: object,
  channel: InboxChannel = "process"
) {
  const response =
    payload === undefined
      ? await page.request.post(path, {
          headers: getInboxInternalHeaders(channel),
        })
      : await page.request.post(path, {
          headers: getInboxInternalHeaders(channel),
          data: payload,
        });

  if (!response.ok()) {
    throw new Error(
      `Internal inbox request failed (${response.status()}): ${await response.text()}`
    );
  }

  return (await response.json()) as InternalResponse<T>;
}

async function getInternalInboxError(page: Page, path: string) {
  const response = await page.request.get(path, {
    headers: getInboxInternalHeaders("process"),
  });

  return {
    status: response.status(),
    body: (await response.json()) as InternalErrorResponse,
  };
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

async function lookupWorkspaceIdBySlug(workspaceSlug: string) {
  const rows = await getSqlClient()<
    {
      id: string;
    }[]
  >`
    select id
    from public.workspaces
    where slug = ${workspaceSlug}
    limit 1
  `;

  const workspace = rows[0];
  if (!workspace) {
    throw new Error(
      `Workspace ${workspaceSlug} was not found in the database.`
    );
  }

  return workspace.id;
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
  await page.goto("/app/new-workspace");
  await expect(page).toHaveURL(/\/app\/new-workspace$/);

  await page.locator('input[name="name"]').fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
    timeout: 30_000,
  });

  return {
    workspaceSlug,
    workspaceId: await lookupWorkspaceIdBySlug(workspaceSlug),
  };
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

test.afterAll(async () => {
  if (sqlClient) {
    await sqlClient.end({ timeout: 0 });
    sqlClient = null;
  }
});

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
      page.getByRole("heading", { name: "Inbox", exact: true })
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

    await expect(
      page.getByRole("heading", { name: "Answer the pending clarification" })
    ).toBeVisible({ timeout: 30_000 });
    const executionTelemetryToggle = page.getByText("Execution telemetry", {
      exact: true,
    });
    await expect(executionTelemetryToggle).toBeVisible();
    await executionTelemetryToggle.click();
    await expect(page.getByText("Attempt 2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "persist_raw" }).first()).toBeVisible();
    await expect(
      page
        .getByText(
          "A single clarification is likely to change the routing outcome more than it costs the user."
        )
        .first()
    ).toBeVisible();

    await page.getByRole("textbox", { name: "Answer clarification" }).fill(answerText);
    await page.getByRole("button", { name: "Answer clarification" }).click();

    await expect(
      page.getByRole("button", { name: "Answer clarification" })
    ).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(answerText).first()).toBeVisible();
    await expect
      .poll(async () => {
        const text = await page.locator(".sl-inbox-detail-stack").textContent();
        return /ready for review|applied|parked|discarded/.test(text ?? "");
      })
      .toBe(true);

    await expect(
      page.getByRole("link", { name: /Review in Learning|Open Map/ }).first()
    ).toBeVisible();
  });

  test("blocks cross-workspace inbox item access in routes and UI", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    test.skip(
      !hasInboxInternalSecret("create"),
      "INBOX_INTERNAL_CREATE_SECRET is required for create-channel e2e coverage."
    );

    const userId = randomUUID();
    const workspaceOne = await createWorkspace(page, userId);
    const { mapId: mapOneId } = await createMap(
      page,
      userId,
      workspaceOne.workspaceSlug
    );
    const workspaceTwo = await createWorkspace(page, userId);
    await createMap(page, userId, workspaceTwo.workspaceSlug);

    const created = await postInternalInbox<{ id: string }>(
      page,
      "/api/internal/inbox/items",
      {
        userId,
        workspaceId: workspaceOne.workspaceId,
        mapId: mapOneId,
        sourceType: "manual_note",
        rawText: "Workspace one only signal.",
        idempotencyKey: `cross-workspace-${randomUUID()}`,
      },
      "create"
    );

    const routeResponse = await getInternalInboxError(
      page,
      `/api/internal/inbox/items/${created.data.id}?workspaceId=${workspaceTwo.workspaceId}`
    );

    expect(routeResponse.status).toBe(404);
    expect(routeResponse.body).toEqual({
      code: "inbox_item_not_found",
      error: "Inbox item not found.",
    });

    await authenticateAsE2EUser(page, userId);
    await page.goto(
      `/app/${workspaceTwo.workspaceSlug}/inbox?item=${created.data.id}`
    );
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible();
    await expect(page.getByText(/not available in this workspace/)).toBeVisible();
    await expect(page.getByText("Workspace one only signal.")).toHaveCount(0);
  });

  test("keeps duplicate create semantics predictable across workspace scope", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    test.skip(
      !hasInboxInternalSecret("create"),
      "INBOX_INTERNAL_CREATE_SECRET is required for create-channel e2e coverage."
    );

    const userId = randomUUID();
    const workspaceOne = await createWorkspace(page, userId);
    const { mapId: mapOneId } = await createMap(
      page,
      userId,
      workspaceOne.workspaceSlug
    );
    const workspaceTwo = await createWorkspace(page, userId);
    const { mapId: mapTwoId } = await createMap(
      page,
      userId,
      workspaceTwo.workspaceSlug
    );
    const idempotencyKey = `predictable-duplicate-${randomUUID()}`;
    const payload = {
      userId,
      workspaceId: workspaceOne.workspaceId,
      mapId: mapOneId,
      sourceType: "manual_note",
      rawText: "Predictable duplicate signal.",
      idempotencyKey,
    };

    const first = await page.request.post("/api/internal/inbox/items", {
      headers: getInboxInternalHeaders("create"),
      data: payload,
    });
    const replay = await page.request.post("/api/internal/inbox/items", {
      headers: getInboxInternalHeaders("create"),
      data: payload,
    });
    const crossWorkspaceConflict = await page.request.post(
      "/api/internal/inbox/items",
      {
        headers: getInboxInternalHeaders("create"),
        data: {
          ...payload,
          workspaceId: workspaceTwo.workspaceId,
          mapId: mapTwoId,
        },
      }
    );

    expect(first.status()).toBe(201);
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual(await first.json());
    expect(crossWorkspaceConflict.status()).toBe(409);
    expect(await crossWorkspaceConflict.json()).toEqual({
      code: "inbox_duplicate_conflict",
      error:
        "Idempotency key already belongs to another workspace, map, or user.",
    });
  });
});

test.describe("Inbox workbench mobile smoke", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("keeps mobile triage usable without horizontal overflow", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const userId = randomUUID();
    const { workspaceSlug } = await createWorkspace(page, userId);
    await createMap(page, userId, workspaceSlug);

    await page.goto(`/app/${workspaceSlug}/inbox`);
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible();

    await page.locator('textarea[name="rawText"]').fill(
      "Mobile triage smoke signal."
    );
    await page.getByRole("button", { name: "Create inbox item" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/inbox\\?item=`), {
      timeout: 30_000,
    });

    await expect(page.locator(".sl-inbox-page")).toHaveAttribute(
      "data-mobile-view",
      "detail"
    );
    await expect(page.getByRole("link", { name: "Back to queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Triage Summary" })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole("link", { name: "Back to queue" }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${workspaceSlug}/inbox$`));
  });
});

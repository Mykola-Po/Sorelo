import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

type InternalResponse<T> = {
  data: T;
};

type InboxItemDetail = {
  item: {
    id: string;
    workspaceId: string | null;
    mapId: string | null;
    status: string;
  };
  fragments: Array<{
    id: string;
    ordinal: number;
    fragmentText: string;
    sourceKind: string;
    clarificationAnswerId: string | null;
  }>;
  structuredPackets: Array<{
    id: string;
  }>;
  clarificationRequests: Array<{
    id: string;
    status: string;
  }>;
  reviewBatches: Array<{
    id: string;
    artifacts: Array<{
      id: string;
      artifactOrder: number;
      suggestionType: string;
      proposedPayload: Record<string, unknown>;
      resolutionType: string | null;
      applyStatus: string | null;
    }>;
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
      "INTERNAL_API_SECRET is required for internal inbox and learning e2e requests."
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

async function createWorkspaceAndOpenMap(page: Page, userId: string) {
  const suffix = `${Date.now()}`;
  const workspaceName = `Provenance Workspace ${suffix}`;
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
    title: `Provenance Map ${suffix}`,
    subjectLabel: "Alex",
    description: "Map used to verify canonical provenance in the Inspector.",
  });
  await page.goto(`/app/${workspaceSlug}/maps/${map.data.id}`);

  await expect(page.locator(".map-screen").first()).toBeVisible();

  return {
    workspaceSlug,
    mapId: map.data.id,
  };
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

async function postInternalLearning<T>(
  page: Page,
  path: string,
  payload: object
) {
  const response = await page.request.post(path, {
    headers: {
      authorization: `Bearer ${getInternalApiSecret()}`,
    },
    data: payload,
  });

  if (!response.ok()) {
    throw new Error(
      `Internal learning request failed (${response.status()}): ${await response.text()}`
    );
  }

  return (await response.json()) as InternalResponse<T>;
}

test.describe("Inbox canonical provenance", () => {
  test("accepting an inbox review artifact surfaces provenance in the Inspector", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const rawText =
      "Public criticism from close people causes withdrawal and a defensive reaction. What exactly triggers the reaction first? We need to know who is involved before promotion.";
    const answerText =
      "The reaction starts when the criticism comes from a close partner in front of other people.";
    const userId = randomUUID();
    const { workspaceSlug, mapId } = await createWorkspaceAndOpenMap(page, userId);

    await page.goto(`/app/${workspaceSlug}/inbox`);
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();

    await page.locator('textarea[name="rawText"]').fill(rawText);
    await page.getByRole("button", { name: "Create inbox item" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}/inbox\\?item=`), {
      timeout: 30_000,
    });

    const [, itemId = ""] = page.url().match(/[?&]item=([^&#]+)/) ?? [];
    expect(itemId).not.toBe("");

    await postInternalInbox(page, `/api/internal/inbox/items/${itemId}/process`);

    let clarificationRequestId!: string;
    await expect
      .poll(async () => {
        const response = await getInternalInbox<InboxItemDetail>(
          page,
          `/api/internal/inbox/items/${itemId}`
        );
        clarificationRequestId =
          response.data.clarificationRequests.find(
            (request) => request.status === "pending"
          )?.id ?? "";

        return clarificationRequestId || null;
      }, {
        timeout: 30_000,
        intervals: [1_000, 2_000],
      })
      .toEqual(expect.any(String));

    await postInternalInbox(
      page,
      `/api/internal/inbox/clarification-requests/${clarificationRequestId}/answer`,
      {
        answerText,
      }
    );

    const conceptTitle = "Public criticism";
    let reviewContext!: {
      workspaceId: string;
      packetId: string;
      evidenceOrdinal: number;
      status: string;
    };

    await expect
      .poll(async () => {
        const response = await getInternalInbox<InboxItemDetail>(
          page,
          `/api/internal/inbox/items/${itemId}`
        );
        const packetId = response.data.structuredPackets[0]?.id;
        const evidenceFragment =
          response.data.fragments.find(
            (fragment) => fragment.sourceKind === "clarification_answer"
          ) ?? response.data.fragments[0];

        if (
          !response.data.item.workspaceId ||
          !packetId ||
          !evidenceFragment
        ) {
          return null;
        }

        reviewContext = {
          workspaceId: response.data.item.workspaceId,
          packetId,
          evidenceOrdinal: evidenceFragment.ordinal,
          status: response.data.item.status,
        };

        return reviewContext;
      }, {
        timeout: 60_000,
        intervals: [1_000, 2_000, 3_000],
      })
      .toEqual(
        expect.objectContaining({
          workspaceId: expect.any(String),
          packetId: expect.any(String),
          evidenceOrdinal: expect.any(Number),
          status: expect.any(String),
        })
      );

    const suggestionBatch = await postInternalLearning<{ id: string }>(
      page,
      "/api/internal/learning/suggestion-batches",
      {
        workspaceId: reviewContext.workspaceId,
        mapId,
        initiatedByUserId: userId,
        inboxItemId: itemId,
        inboxPacketId: reviewContext.packetId,
        batchType: "inbox_review",
        modelName: "e2e-learning-model",
        modelVersion: "test-1",
        promptVersion: "prompt-1",
        inputHash: `inbox-provenance-${Date.now()}`,
        status: "completed",
      }
    );

    await postInternalLearning<{ id: string }[]>(
      page,
      "/api/internal/learning/suggestions",
      {
        suggestions: [
          {
            batchId: suggestionBatch.data.id,
            workspaceId: reviewContext.workspaceId,
            mapId,
            inboxItemId: itemId,
            inboxPacketId: reviewContext.packetId,
            artifactOrder: 0,
            suggestionType: "create_concept",
            targetEntityType: "none",
            targetEntityId: null,
            proposedPayload: {
              operation: {
                operationType: "create_concept",
                conceptRef: "public-criticism",
                title: conceptTitle,
                conceptType: "trigger",
                summary: "Public criticism acts as a trigger.",
                description: "Created during the inbox provenance e2e flow.",
                evidenceFragmentOrdinals: [reviewContext.evidenceOrdinal],
              },
              before: {},
              after: {},
              evidenceFragmentOrdinals: [reviewContext.evidenceOrdinal],
              inboxItemId: itemId,
              inboxPacketId: reviewContext.packetId,
              artifactOrder: 0,
            },
            rationale:
              "The inbox clarification confirms that public criticism is a canonical trigger.",
            confidence: 0.93,
          },
        ],
      }
    );

    await page.goto(`/app/${workspaceSlug}/maps/${mapId}`);
    await expect(page.locator(".map-screen").first()).toBeVisible();
    await page
      .locator(".map-bottom-dock")
      .getByRole("button", { name: "Learning" })
      .click();
    const learningDialog = page.getByRole("dialog");
    await expect(
      learningDialog.getByRole("button", { name: "Accept" }).first()
    ).toBeVisible({ timeout: 30_000 });
    await learningDialog.getByRole("button", { name: "Accept" }).first().click();

    await expect(learningDialog.getByText("Resolved: 1")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      learningDialog.getByRole("button", { name: "Accept" })
    ).toHaveCount(0, {
      timeout: 30_000,
    });

    await expect
      .poll(async () => {
        const graphResponse = await page.request.get(
          `/api/maps/${mapId}/graph`
        );
        if (!graphResponse.ok()) {
          return 0;
        }

        const graph = (await graphResponse.json()) as {
          concepts: Array<{ id: string; title: string }>;
        };
        return graph.concepts.length;
      }, {
        timeout: 30_000,
        intervals: [1_000, 2_000, 3_000],
      })
      .toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator(".sl-concept-card").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.locator(".sl-concept-card").first().click();

    await expect(
      page.getByRole("heading", { name: conceptTitle })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Provenance", exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(`Clarification answer: ${answerText}`)
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open in Inbox" })
    ).toBeVisible();
  });
});

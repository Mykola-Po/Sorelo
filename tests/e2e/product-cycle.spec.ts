import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

type GraphSnapshot = {
  concepts: Array<{ id: string; title: string }>;
  links: Array<{ id: string }>;
};

type ElementLayout = {
  height: number;
  top: number;
  bottom: number;
};

type MapLayoutSnapshot = {
  viewportHeight: number;
  appShellPadding: number;
  productShell: ElementLayout;
  productBody: ElementLayout;
  mapScreen: ElementLayout;
  mapBottomDock: ElementLayout;
};

type ConceptCreateResponse = {
  concept: {
    id: string;
    workspaceId: string;
    createdByUserId: string;
  };
};

type InternalLearningResponse<T> = {
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

function getInternalLearningSecret() {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    readDotenvValue("SUPABASE_SECRET_KEY") ??
    "secret-key"
  );
}

function getCurrentMapId(page: Page) {
  const [, mapId = ""] = page.url().match(/\/maps\/([^/?#]+)/) ?? [];
  return mapId;
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

async function readMapLayout(page: Page) {
  return page.evaluate((): MapLayoutSnapshot => {
    const getElement = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing layout element: ${selector}`);
      }
      return element;
    };

    const toLayout = (element: HTMLElement): ElementLayout => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
      };
    };

    const appShell = getElement(".viewport-shell.app-shell");
    const productShell = getElement(".product-shell");
    const productBody = getElement(".product-body");
    const mapScreen = getElement(".map-screen");
    const mapBottomDock = getElement(".map-bottom-dock");

    return {
      viewportHeight: window.innerHeight,
      appShellPadding: Number.parseFloat(getComputedStyle(appShell).paddingTop) || 0,
      productShell: toLayout(productShell),
      productBody: toLayout(productBody),
      mapScreen: toLayout(mapScreen),
      mapBottomDock: toLayout(mapBottomDock),
    };
  });
}

async function readGraphSnapshot(page: Page) {
  const mapId = getCurrentMapId(page);
  expect(mapId).not.toBe("");

  const response = await page.request.get(
    `/api/maps/${mapId}/graph?width=1280&height=720`
  );
  if (!response.ok()) {
    throw new Error(
      `Graph request failed (${response.status()}): ${await response.text()}`
    );
  }
  return (await response.json()) as GraphSnapshot;
}

async function postInternalLearning<T>(
  page: Page,
  path: string,
  payload: object
) {
  const response = await page.request.post(path, {
    headers: {
      authorization: `Bearer ${getInternalLearningSecret()}`,
    },
    data: payload,
  });

  if (!response.ok()) {
    throw new Error(
      `Internal learning request failed (${response.status()}): ${await response.text()}`
    );
  }

  return (await response.json()) as InternalLearningResponse<T>;
}

test.describe("critical product cycle", () => {
  test("sign in -> workspace -> map -> concept/link -> scenario", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const suffix = `${Date.now()}`;
    const e2eUserId = randomUUID();
    const workspaceName = `E2E Workspace ${suffix}`;
    const workspaceSlug = normalizeWorkspaceSlug(workspaceName);
    const conceptSourceTitle = `Trigger ${suffix}`;
    const conceptTargetTitle = `Reaction ${suffix}`;

    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Build an explainable map of a person.",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
    const appOrigin = new URL(page.url()).origin;

    await page.context().addCookies([
      {
        name: "sorela-e2e-auth",
        value: "1",
        url: appOrigin,
      },
      {
        name: "sorela-e2e-auth-user",
        value: e2eUserId,
        url: appOrigin,
      },
    ]);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/new-workspace$/);

    await page.locator('input[name="name"]').fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL(new RegExp(`/app/${workspaceSlug}$`), {
      timeout: 30_000,
    });

    await page.locator('input[name="title"]').fill(`Cycle Map ${suffix}`);
    await page.locator('input[name="subjectLabel"]').fill("Alex");
    await page
      .locator('textarea[name="description"]')
      .fill("Map for the end-to-end product cycle.");
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

    const layout = await readMapLayout(page);
    const expectedShellHeight = layout.viewportHeight - layout.appShellPadding * 2;
    const mapBodyHeightDelta = Math.abs(layout.productBody.height - layout.mapScreen.height);
    const dockBottomGap = layout.mapScreen.bottom - layout.mapBottomDock.bottom;
    const dockOffsetFromTop = layout.mapBottomDock.top - layout.mapScreen.top;

    expect(layout.productShell.height).toBeGreaterThan(layout.viewportHeight * 0.8);
    expect(Math.abs(layout.productShell.height - expectedShellHeight)).toBeLessThanOrEqual(4);
    expect(layout.mapScreen.height).toBeGreaterThan(layout.mapBottomDock.height * 4);
    expect(mapBodyHeightDelta).toBeLessThanOrEqual(6);
    expect(dockBottomGap).toBeLessThanOrEqual(40);
    expect(dockOffsetFromTop).toBeGreaterThan(layout.mapScreen.height * 0.5);

    const firstConceptResponse = await page.request.post(
      `/api/maps/${getCurrentMapId(page)}/concepts`,
      {
        data: {
          title: conceptSourceTitle,
          conceptType: "trigger",
          summary: "Public criticism acts as a trigger.",
          description: "E2E source concept",
          x: 220,
          y: 180,
        },
      }
    );
    expect(firstConceptResponse.ok()).toBeTruthy();
    const firstConceptBody =
      (await firstConceptResponse.json()) as ConceptCreateResponse;

    const secondConceptResponse = await page.request.post(
      `/api/maps/${getCurrentMapId(page)}/concepts`,
      {
        data: {
          title: conceptTargetTitle,
          conceptType: "state",
          summary: "Defensive reaction is activated.",
          description: "E2E target concept",
          x: 420,
          y: 280,
        },
      }
    );
    expect(secondConceptResponse.ok()).toBeTruthy();

    const snapshot = await readGraphSnapshot(page);
    const sourceId = snapshot.concepts.find((concept) => concept.title === conceptSourceTitle)?.id;
    const targetId = snapshot.concepts.find((concept) => concept.title === conceptTargetTitle)?.id;
    expect(sourceId).toBeTruthy();
    expect(targetId).toBeTruthy();
    if (!sourceId || !targetId) {
      throw new Error("Unable to resolve concept ids for link creation.");
    }

    const linkResponse = await page.request.post(
      `/api/maps/${getCurrentMapId(page)}/links`,
      {
        data: {
          sourceConceptId: sourceId,
          targetConceptId: targetId,
          relationType: "causes",
          strength: 3,
          description: "E2E link",
        },
      }
    );
    expect(linkResponse.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const nextSnapshot = await readGraphSnapshot(page);
        return nextSnapshot.links.length;
      })
      .toBeGreaterThan(0);

    const sourceFragment = await postInternalLearning<{ id: string }>(
      page,
      "/api/internal/learning/source-fragments",
      {
        workspaceId: firstConceptBody.concept.workspaceId,
        mapId: getCurrentMapId(page),
        authorUserId: firstConceptBody.concept.createdByUserId ?? e2eUserId,
        sourceType: "manual_note",
        rawText:
          "Public criticism usually activates the trigger, but the evidence is still incomplete.",
      }
    );
    const suggestionBatch = await postInternalLearning<{ id: string }>(
      page,
      "/api/internal/learning/suggestion-batches",
      {
        workspaceId: firstConceptBody.concept.workspaceId,
        mapId: getCurrentMapId(page),
        initiatedByUserId: firstConceptBody.concept.createdByUserId ?? e2eUserId,
        batchType: "extract",
        modelName: "e2e-learning-model",
        modelVersion: "test-1",
        promptVersion: "prompt-1",
        inputHash: `learning-${suffix}`,
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
            workspaceId: firstConceptBody.concept.workspaceId,
            mapId: getCurrentMapId(page),
            sourceFragmentId: sourceFragment.data.id,
            suggestionType: "update_concept",
            targetEntityType: "concept",
            targetEntityId: sourceId,
            proposedPayload: {
              before: {
                title: conceptSourceTitle,
                summary: "Public criticism acts as a trigger.",
              },
              after: {
                title: `${conceptSourceTitle} refined`,
                summary: "Public criticism reliably activates the trigger.",
              },
            },
            rationale:
              "Existing evidence suggests the Concept needs refinement, but the context is still incomplete.",
            confidence: 0.64,
          },
        ],
      }
    );

    const runResponse = await page.request.post(
      `/api/maps/${getCurrentMapId(page)}/scenario-runs`,
      {
        data: {
          triggerText: "A colleague publicly challenges the person.",
          seedConceptIds: [sourceId],
        },
      }
    );
    expect(runResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByText("Map ready")).toBeVisible();
    await page.getByRole("button", { name: "Learning" }).click();
    const learningDialog = page.getByRole("dialog");
    await expect(learningDialog.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(learningDialog.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(learningDialog.getByRole("button", { name: "Reject" })).toBeVisible();
    await expect(
      learningDialog.getByRole("button", { name: "Needs context" })
    ).toBeVisible();
    await learningDialog
      .locator('textarea[name="reasonText"]')
      .fill("Need stronger evidence.");
    await learningDialog.getByRole("button", { name: "Needs context" }).click();
    await expect(learningDialog.getByText("Open: 0")).toBeVisible({
      timeout: 20_000,
    });
    await expect(learningDialog.getByText("Resolved: 1")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      learningDialog.getByRole("button", { name: "Needs context" })
    ).toHaveCount(0, { timeout: 20_000 });

    await page.reload();
    await page.getByRole("button", { name: "Learning" }).click();
    const reloadedLearningDialog = page.getByRole("dialog");
    await expect(reloadedLearningDialog.getByText("Open: 0")).toBeVisible({
      timeout: 20_000,
    });
    await expect(reloadedLearningDialog.getByText("Resolved: 1")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      reloadedLearningDialog.getByRole("button", { name: "Needs context" })
    ).toHaveCount(0, { timeout: 20_000 });
    await expect(reloadedLearningDialog.getByText("needs context")).toBeVisible({
      timeout: 20_000,
    });
  });
});

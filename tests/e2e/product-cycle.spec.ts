import { expect, test, type Page } from "@playwright/test";
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

test.describe("critical product cycle", () => {
  test("sign in -> workspace -> map -> concept/link -> scenario", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const suffix = `${Date.now()}`;
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

    await page.context().addCookies([
      {
        name: "sorela-e2e-auth",
        value: "1",
        url: "http://127.0.0.1:3100",
      },
      {
        name: "sorela-e2e-auth-user",
        value: randomUUID(),
        url: "http://127.0.0.1:3100",
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
  });
});

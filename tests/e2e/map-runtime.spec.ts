import { expect, test, type Page } from "@playwright/test";

// We mock the graph response so that nodes are predictably placed.
const mockGraphSnapshot = {
  revision: 1,
  concepts: [
    {
      id: "node-a",
      mapId: "test-map",
      conceptType: "actor",
      title: "Node A",
      summary: null,
      x: 100,
      y: 100,
    },
    {
      id: "node-b",
      mapId: "test-map",
      conceptType: "actor",
      title: "Node B",
      summary: null,
      x: 300,
      y: 300,
    },
  ],
  links: [],
};

type CameraSnapshot = {
  ratio: number;
  minRatio: number;
  maxRatio: number;
};

async function getCameraSnapshot(page: Page): Promise<CameraSnapshot> {
  return page.evaluate(() => {
    const sigma = (
      window as Window & {
        __SIGMA__?: {
          getCamera: () => { getState: () => { ratio: number } };
          getSettings: () => {
            minCameraRatio: number | null;
            maxCameraRatio: number | null;
          };
        };
      }
    ).__SIGMA__;

    if (!sigma) {
      throw new Error("Sigma instance is not available");
    }

    const ratio = sigma.getCamera().getState().ratio;
    const settings = sigma.getSettings();
    const minRatio = settings.minCameraRatio;
    const maxRatio = settings.maxCameraRatio;

    if (minRatio == null || maxRatio == null) {
      throw new Error("Camera zoom bounds are not configured");
    }

    return { ratio, minRatio, maxRatio };
  });
}

test.describe("Map Runtime WebGL Canvas", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept network requests made by GraphCanvasRuntime React component
    await page.route("**/api/maps/test-map/graph*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGraphSnapshot),
      });
    });

    // Mock the position save endpoint to prevent network errors in console
    await page.route("**/api/maps/test-map/concepts/positions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ revision: 2, concepts: [] }),
      });
    });

    await page.goto("/e2e/map-runtime");

    // Wait until loading indicator goes away
    await expect(page.locator("text=Loading snapshot")).not.toBeVisible();
    
    // Wait for the WebGL canvas to be mounted
    await expect(page.locator("canvas").first()).toBeVisible();
    
    // Give Sigma half a second to complete its first render cycle
    await page.waitForTimeout(500); 
  });

  test("Clicking a Node opens the inspector", async ({ page }) => {
    // We emit the clickNode event directly to safely test our application boundary
    // without fragile WebGL raycasting dependence.
    await page.evaluate(() => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { emit: (eventName: string, payload: unknown) => void };
        }
      ).__SIGMA__;
      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }
      sigma.emit("clickNode", { node: "node-a" });
    });
    
    await expect(page.getByTestId("last-action")).toHaveText(/Inspect Concept/);
    await expect(page.getByTestId("selection")).toHaveText("Selection: concept");
  });

  test("Placing a Concept updates the interaction state", async ({ page }) => {
    await page.getByTestId("set-mode-concept").click();
    await expect(page.getByTestId("current-mode")).toHaveText("Mode: placeConcept");

    await page.evaluate(() => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { emit: (eventName: string, payload: unknown) => void };
        }
      ).__SIGMA__;
      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }
      sigma.emit("clickStage", { event: { x: 100, y: 100 } });
    });

    await expect(page.getByTestId("last-action")).toHaveText(/Create Concept at/);
    await expect(page.getByTestId("selection")).toHaveText("Selection: create-concept");
  });

  test("Connecting a Link updates the interaction state", async ({ page }) => {
    await page.getByTestId("set-mode-link").click();
    await expect(page.getByTestId("current-mode")).toHaveText("Mode: connectLink");

    // Source Node
    await page.evaluate(() => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { emit: (eventName: string, payload: unknown) => void };
        }
      ).__SIGMA__;
      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }
      sigma.emit("clickNode", { node: "node-a" });
    });
    await expect(page.getByTestId("last-action")).toHaveText(/Picked Connect Source/);

    // Target Node
    await page.evaluate(() => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { emit: (eventName: string, payload: unknown) => void };
        }
      ).__SIGMA__;
      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }
      sigma.emit("clickNode", { node: "node-b" });
    });
    await expect(page.getByTestId("last-action")).toHaveText(/Completed Link/);
    await expect(page.getByTestId("selection")).toHaveText("Selection: create-link");
  });

  test("Wheel zoom is bounded and monotonic across configured range", async ({
    page,
  }) => {
    const { minRatio, maxRatio } = await getCameraSnapshot(page);
    const zoomOutRatios = await page.evaluate(async () => {
      const sigma = (
        window as Window & {
          __SIGMA__?: {
            getCamera: () => { getState: () => { ratio: number } };
          };
        }
      ).__SIGMA__;
      const layer = document.querySelector(".sl-concept-card-layer");

      if (!sigma || !(layer instanceof HTMLElement)) {
        throw new Error("Runtime layer is not available");
      }

      const ratios: number[] = [];
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      for (let i = 0; i < 10; i += 1) {
        layer.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: 140,
            deltaMode: 0,
            clientX: centerX,
            clientY: centerY,
            bubbles: true,
            cancelable: true,
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
        ratios.push(sigma.getCamera().getState().ratio);
      }

      for (let i = 0; i < 10; i += 1) {
        layer.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: -140,
            deltaMode: 0,
            clientX: centerX,
            clientY: centerY,
            bubbles: true,
            cancelable: true,
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
        ratios.push(sigma.getCamera().getState().ratio);
      }

      return ratios;
    });

    const zoomOutSlice = zoomOutRatios.slice(0, 10);
    const zoomInSlice = zoomOutRatios.slice(10);

    for (let i = 1; i < zoomOutSlice.length; i += 1) {
      const previousRatio = zoomOutSlice[i - 1];
      const currentRatio = zoomOutSlice[i];
      expect(previousRatio).toBeDefined();
      expect(currentRatio).toBeDefined();
      if (previousRatio == null || currentRatio == null) {
        continue;
      }
      expect(currentRatio).toBeGreaterThanOrEqual(previousRatio - 0.0001);
      expect(currentRatio).toBeLessThanOrEqual(maxRatio + 0.0001);
      expect(currentRatio).toBeGreaterThanOrEqual(minRatio - 0.0001);
    }

    for (let i = 1; i < zoomInSlice.length; i += 1) {
      const previousRatio = zoomInSlice[i - 1];
      const currentRatio = zoomInSlice[i];
      expect(previousRatio).toBeDefined();
      expect(currentRatio).toBeDefined();
      if (previousRatio == null || currentRatio == null) {
        continue;
      }
      expect(currentRatio).toBeLessThanOrEqual(previousRatio + 0.0001);
      expect(currentRatio).toBeLessThanOrEqual(maxRatio + 0.0001);
      expect(currentRatio).toBeGreaterThanOrEqual(minRatio - 0.0001);
    }
  });

  test("LOD switches from cards to dots and shows hover-card while zoomed out", async ({
    page,
  }) => {
    const { minRatio, maxRatio } = await getCameraSnapshot(page);

    await page.evaluate((ratio) => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { getCamera: () => { setState: (state: { ratio: number }) => void } };
        }
      ).__SIGMA__;
      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }
      sigma.getCamera().setState({ ratio });
    }, minRatio);

    await page.waitForTimeout(80);
    const nearState = await page.evaluate(() => {
      const card = document.querySelector(".sl-concept-card");
      const dot = document.querySelector(".sl-concept-dot");
      if (!(card instanceof HTMLElement) || !(dot instanceof HTMLElement)) {
        throw new Error("Concept layers are not available");
      }
      const cardStyle = getComputedStyle(card);
      const dotStyle = getComputedStyle(dot);
      return {
        cardOpacity: Number(cardStyle.opacity),
        cardPointerEvents: cardStyle.pointerEvents,
        dotOpacity: Number(dotStyle.opacity),
        dotPointerEvents: dotStyle.pointerEvents,
      };
    });

    expect(nearState.cardOpacity).toBeGreaterThan(0.8);
    expect(nearState.cardPointerEvents).toBe("auto");
    expect(nearState.dotOpacity).toBeLessThan(0.2);
    expect(nearState.dotPointerEvents).toBe("none");

    await page.evaluate((ratio) => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { getCamera: () => { setState: (state: { ratio: number }) => void } };
        }
      ).__SIGMA__;
      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }
      sigma.getCamera().setState({ ratio });
    }, maxRatio);

    await page.waitForTimeout(120);
    const farState = await page.evaluate(() => {
      const card = document.querySelector(".sl-concept-card");
      const dot = document.querySelector(".sl-concept-dot");
      if (!(card instanceof HTMLElement) || !(dot instanceof HTMLElement)) {
        throw new Error("Concept layers are not available");
      }
      const cardStyle = getComputedStyle(card);
      const dotStyle = getComputedStyle(dot);
      return {
        cardOpacity: Number(cardStyle.opacity),
        cardPointerEvents: cardStyle.pointerEvents,
        dotOpacity: Number(dotStyle.opacity),
        dotPointerEvents: dotStyle.pointerEvents,
      };
    });

    expect(farState.cardOpacity).toBeLessThan(0.2);
    expect(farState.cardPointerEvents).toBe("none");
    expect(farState.dotOpacity).toBeGreaterThan(0.8);
    expect(farState.dotPointerEvents).toBe("auto");

    await page.locator(".sl-concept-dot").first().dispatchEvent("pointerover");
    await page.waitForTimeout(80);

    const hoverCard = page.locator(".sl-concept-hover-card-layer .sl-concept-card");
    await expect(hoverCard).toHaveCount(1);
    const hoverCardOpacity = await hoverCard.evaluate((element) =>
      Number(getComputedStyle(element).opacity)
    );

    expect(hoverCardOpacity).toBeGreaterThan(0.8);
  });
});

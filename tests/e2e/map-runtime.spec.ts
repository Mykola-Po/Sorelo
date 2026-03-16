import { expect, test, type Page } from "@playwright/test";

function createMockGraphSnapshot() {
  return {
    revision: 1,
    concepts: [
      {
        id: "node-a",
        mapId: "test-map",
        conceptType: "custom",
        title: "Node A",
        summary: null,
        x: 100,
        y: 100,
      },
      {
        id: "node-b",
        mapId: "test-map",
        conceptType: "custom",
        title: "Node B",
        summary: null,
        x: 300,
        y: 300,
      },
    ],
    links: [],
  };
}

type CameraSnapshot = {
  x: number;
  y: number;
  ratio: number;
  minRatio: number;
  maxRatio: number;
};

type GraphRequestViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  overscan: number;
};

type PositionSavePayload = {
  positions: Array<{
    conceptId: string;
    x: number;
    y: number;
  }>;
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

    const cameraState = sigma.getCamera().getState();

    return {
      x: cameraState.x,
      y: cameraState.y,
      ratio,
      minRatio,
      maxRatio,
    };
  });
}

async function setCameraRatio(page: Page, ratio: number) {
  await page.evaluate((nextRatio) => {
    const sigma = (
      window as Window & {
        __SIGMA__?: { getCamera: () => { setState: (state: { ratio: number }) => void } };
      }
    ).__SIGMA__;
    if (!sigma) {
      throw new Error("Sigma instance is not available");
    }
    sigma.getCamera().setState({ ratio: nextRatio });
  }, ratio);
}

async function getNodePosition(page: Page, conceptId: string) {
  return page.evaluate((nodeId) => {
    const sigma = (
      window as Window & {
        __SIGMA__?: {
          getGraph: () => {
            getNodeAttribute: (id: string, key: "x" | "y") => number;
          };
        };
      }
    ).__SIGMA__;

    if (!sigma) {
      throw new Error("Sigma instance is not available");
    }

    const graph = sigma.getGraph();
    return {
      x: graph.getNodeAttribute(nodeId, "x"),
      y: graph.getNodeAttribute(nodeId, "y"),
    };
  }, conceptId);
}

async function dragLocatorWithMouse(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  options: {
    deltaX: number;
    deltaY: number;
    holdMs?: number;
  }
) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + options.deltaX;
  const endY = startY + options.deltaY;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 14 });
  if (options.holdMs) {
    await page.waitForTimeout(options.holdMs);
  }
  await page.mouse.up();
}

async function dispatchTouchSequence(
  locator: ReturnType<Page["locator"]>,
  input: {
    startX: number;
    startY: number;
    moveX?: number;
    moveY?: number;
    holdBeforeMoveMs?: number;
    holdBeforeUpMs?: number;
  }
) {
  await locator.evaluate(
    async (
      element,
      payload: {
        startX: number;
        startY: number;
        moveX?: number;
        moveY?: number;
        holdBeforeMoveMs?: number;
        holdBeforeUpMs?: number;
      }
    ) => {
      const pointerInit = {
        bubbles: true,
        cancelable: true,
      composed: true,
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    };
    const wait = (ms: number) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });

    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        ...pointerInit,
        clientX: payload.startX,
        clientY: payload.startY,
      })
    );

    if (payload.holdBeforeMoveMs) {
      await wait(payload.holdBeforeMoveMs);
    }

    if (typeof payload.moveX === "number" && typeof payload.moveY === "number") {
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          ...pointerInit,
          clientX: payload.moveX,
          clientY: payload.moveY,
        })
      );
    }

    if (payload.holdBeforeUpMs) {
      await wait(payload.holdBeforeUpMs);
    }

    window.dispatchEvent(
      new PointerEvent("pointerup", {
        ...pointerInit,
        clientX: payload.moveX ?? payload.startX,
        clientY: payload.moveY ?? payload.startY,
      })
    );
    },
    input
  );
}

test.describe("Map Runtime WebGL Canvas", () => {
  let graphRequestViewports: GraphRequestViewport[] = [];
  let positionSavePayloads: PositionSavePayload[] = [];
  let positionSaveFailuresRemaining = 0;
  let currentGraphSnapshot = createMockGraphSnapshot();

  test.beforeEach(async ({ page }) => {
    graphRequestViewports = [];
    positionSavePayloads = [];
    positionSaveFailuresRemaining = 0;
    currentGraphSnapshot = createMockGraphSnapshot();

    // Intercept network requests made by GraphCanvasRuntime React component
    await page.route("**/api/maps/test-map/graph*", async (route) => {
      const requestUrl = new URL(route.request().url());
      graphRequestViewports.push({
        x: Number(requestUrl.searchParams.get("x") ?? 0),
        y: Number(requestUrl.searchParams.get("y") ?? 0),
        width: Number(requestUrl.searchParams.get("width") ?? 0),
        height: Number(requestUrl.searchParams.get("height") ?? 0),
        overscan: Number(requestUrl.searchParams.get("overscan") ?? 0),
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentGraphSnapshot),
      });
    });

    // Mock the position save endpoint to prevent network errors in console
    await page.route("**/api/maps/test-map/concepts/positions", async (route) => {
      const payload = route.request().postDataJSON() as PositionSavePayload | null;
      if (payload) {
        positionSavePayloads.push(payload);
      }

      const hasNonIntegerCoordinate = payload?.positions.some(
        (position) =>
          !Number.isInteger(position.x) || !Number.isInteger(position.y)
      );

      if (hasNonIntegerCoordinate) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Positions must use integer coordinates.",
          }),
        });
        return;
      }

      if (positionSaveFailuresRemaining > 0) {
        positionSaveFailuresRemaining -= 1;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Unable to update concept positions.",
          }),
        });
        return;
      }

      if (payload) {
        currentGraphSnapshot = {
          ...currentGraphSnapshot,
          revision: currentGraphSnapshot.revision + 1,
          concepts: currentGraphSnapshot.concepts.map((concept) => {
            const savedPosition = payload.positions.find(
              (position) => position.conceptId === concept.id
            );

            if (!savedPosition) {
              return concept;
            }

            return {
              ...concept,
              x: savedPosition.x,
              y: savedPosition.y,
            };
          }),
        };
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          revision: currentGraphSnapshot.revision,
          concepts:
            payload?.positions.map((position) => ({
              id: position.conceptId,
              x: position.x,
              y: position.y,
            })) ?? [],
        }),
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

  test("Initial graph fetch keeps baseline viewport dimensions", async () => {
    expect(graphRequestViewports.length).toBeGreaterThan(0);

    const initialViewport = graphRequestViewports[0];
    expect(initialViewport).toBeDefined();
    if (!initialViewport) {
      return;
    }

    expect(initialViewport.x).toBe(0);
    expect(initialViewport.y).toBe(0);
    expect(initialViewport.width).toBe(1280);
    expect(initialViewport.height).toBe(860);
    expect(initialViewport.overscan).toBe(320);

    const hasCollapsedViewport = graphRequestViewports.some(
      (viewport) => viewport.width <= 2 || viewport.height <= 2
    );
    expect(hasCollapsedViewport).toBe(false);
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

  test("Dragging a card with the mouse updates its position and saves once on drop", async ({
    page,
  }) => {
    const card = page.getByRole("button", { name: /Node A/ }).first();
    const before = await getNodePosition(page, "node-a");

    await dragLocatorWithMouse(page, card, {
      deltaX: 120,
      deltaY: 80,
    });

    await expect.poll(() => positionSavePayloads.length).toBe(1);

    const after = await getNodePosition(page, "node-a");
    expect(after.x).not.toBe(before.x);
    expect(after.y).not.toBe(before.y);
    expect(positionSavePayloads[0]).toEqual({
      positions: [
        {
          conceptId: "node-a",
          x: after.x,
          y: after.y,
        },
      ],
    });

    await page.reload();
    await expect(page.locator("text=Loading snapshot")).not.toBeVisible();
    await expect(page.locator("canvas").first()).toBeVisible();

    expect(await getNodePosition(page, "node-a")).toEqual(after);
  });

  test("Dragging one Concept keeps the other visible Concept stationary", async ({
    page,
  }) => {
    const draggedCard = page.getByRole("button", { name: /Node A/ }).first();
    const stationaryCard = page.getByRole("button", { name: /Node B/ }).first();
    const stationaryBefore = await stationaryCard.boundingBox();
    expect(stationaryBefore).not.toBeNull();
    if (!stationaryBefore) {
      return;
    }

    const dragBox = await draggedCard.boundingBox();
    expect(dragBox).not.toBeNull();
    if (!dragBox) {
      return;
    }

    const startX = dragBox.x + dragBox.width / 2;
    const startY = dragBox.y + dragBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 96, startY - 140, { steps: 14 });
    await page.waitForTimeout(80);

    const stationaryDuring = await stationaryCard.boundingBox();
    expect(stationaryDuring).not.toBeNull();
    if (!stationaryDuring) {
      return;
    }

    expect(Math.abs(stationaryDuring.x - stationaryBefore.x)).toBeLessThan(24);
    expect(Math.abs(stationaryDuring.y - stationaryBefore.y)).toBeLessThan(24);
    expect(await getNodePosition(page, "node-b")).toEqual({ x: 300, y: 300 });

    await page.mouse.up();
    await expect.poll(() => positionSavePayloads.length).toBe(1);
  });

  test("Dragging keeps the original grab point close to the cursor", async ({
    page,
  }) => {
    const card = page.getByRole("button", { name: /Node A/ }).first();
    const before = await card.boundingBox();
    expect(before).not.toBeNull();
    if (!before) {
      return;
    }

    const startX = before.x + 28;
    const startY = before.y + 24;
    const initialOffset = {
      x: startX - before.x,
      y: startY - before.y,
    };
    const endX = startX + 96;
    const endY = startY + 54;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 14 });
    await page.waitForTimeout(120);

    const during = await card.boundingBox();
    expect(during).not.toBeNull();
    if (!during) {
      return;
    }

    const currentOffset = {
      x: endX - during.x,
      y: endY - during.y,
    };

    expect(Math.abs(currentOffset.x - initialOffset.x)).toBeLessThan(10);
    expect(Math.abs(currentOffset.y - initialOffset.y)).toBeLessThan(12);

    await page.mouse.up();
    await expect.poll(() => positionSavePayloads.length).toBe(1);
  });

  test("Touch tap does not move a Concept, while long-press drag does", async ({ page }) => {
    const card = page.getByRole("button", { name: /Node A/ }).first();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const beforeTap = await getNodePosition(page, "node-a");

    await dispatchTouchSequence(card, {
      startX,
      startY,
      holdBeforeUpMs: 30,
    });

    await page.waitForTimeout(260);
    expect(positionSavePayloads).toHaveLength(0);
    expect(await getNodePosition(page, "node-a")).toEqual(beforeTap);

    await dispatchTouchSequence(card, {
      startX,
      startY,
      moveX: startX + 90,
      moveY: startY + 54,
      holdBeforeMoveMs: 220,
      holdBeforeUpMs: 40,
    });

    await expect.poll(() => positionSavePayloads.length).toBe(1);
    const afterDrag = await getNodePosition(page, "node-a");
    expect(afterDrag.x).not.toBe(beforeTap.x);
    expect(afterDrag.y).not.toBe(beforeTap.y);
  });

  test("Dragging keeps the Concept selected when the Inspector is already open", async ({
    page,
  }) => {
    const card = page.getByRole("button", { name: /Node A/ }).first();
    await card.click();
    await expect(page.getByTestId("selection")).toHaveText("Selection: concept");

    await dragLocatorWithMouse(page, card, {
      deltaX: 72,
      deltaY: 40,
    });

    await expect.poll(() => positionSavePayloads.length).toBe(1);
    await expect(page.getByTestId("selection")).toHaveText("Selection: concept");
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
    const sigmaIdentityBeforeZoom = await page.evaluate(() => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { __e2eStableId?: string };
        }
      ).__SIGMA__;

      if (!sigma) {
        throw new Error("Sigma instance is not available");
      }

      if (!sigma.__e2eStableId) {
        sigma.__e2eStableId = `sigma-${Math.random().toString(36).slice(2)}`;
      }

      return sigma.__e2eStableId;
    });

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

    await page.waitForTimeout(320);
    const sigmaIdentityAfterZoom = await page.evaluate(() => {
      const sigma = (
        window as Window & {
          __SIGMA__?: { __e2eStableId?: string };
        }
      ).__SIGMA__;
      if (!sigma?.__e2eStableId) {
        throw new Error("Sigma identity marker is missing");
      }
      return sigma.__e2eStableId;
    });
    expect(sigmaIdentityAfterZoom).toBe(sigmaIdentityBeforeZoom);

    await page.locator(".sl-concept-dot").first().dispatchEvent("pointerover");
    await page.waitForTimeout(80);

    const hoverCard = page.locator(".sl-concept-hover-card-layer .sl-concept-card");
    await expect(hoverCard).toHaveCount(1);
    const hoverCardOpacity = await hoverCard.evaluate((element) =>
      Number(getComputedStyle(element).opacity)
    );

    expect(hoverCardOpacity).toBeGreaterThan(0.8);
  });

  test("Zoomed-out dots stay clickable but are not draggable", async ({ page }) => {
    const { maxRatio } = await getCameraSnapshot(page);
    await setCameraRatio(page, maxRatio);
    await page.waitForTimeout(120);

    const dot = page.locator(".sl-concept-dot").first();
    const before = await getNodePosition(page, "node-a");

    await dragLocatorWithMouse(page, dot, {
      deltaX: 80,
      deltaY: 30,
    });

    await page.waitForTimeout(180);
    expect(positionSavePayloads).toHaveLength(0);
    expect(await getNodePosition(page, "node-a")).toEqual(before);
  });

  test("Dragging near the edge auto-pans the camera", async ({ page }) => {
    const card = page.getByRole("button", { name: /Node A/ }).first();
    const before = await getCameraSnapshot(page);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const edgeX = viewportWidth - 8;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(edgeX, startY, { steps: 24 });
    await page.waitForTimeout(560);
    await page.mouse.up();

    await expect.poll(() => positionSavePayloads.length).toBe(1);
    const after = await getCameraSnapshot(page);
    expect(after.x).toBeGreaterThan(before.x + 0.03);
  });

  test("Failed save shows inline error after retry exhaustion and clears on the next success", async ({
    page,
  }) => {
    const card = page.getByRole("button", { name: /Node A/ }).first();
    positionSaveFailuresRemaining = 2;

    await dragLocatorWithMouse(page, card, {
      deltaX: 96,
      deltaY: 44,
    });

    await expect(
      page.getByText("Unable to update concept positions.")
    ).toBeVisible({ timeout: 4_500 });
    expect(positionSavePayloads).toHaveLength(2);

    positionSaveFailuresRemaining = 0;
    const recoveryCard = page.getByRole("button", { name: /Node B/ }).first();

    await dragLocatorWithMouse(page, recoveryCard, {
      deltaX: 64,
      deltaY: -36,
    });

    await expect.poll(() => positionSavePayloads.length).toBe(3);
    await expect(
      page.getByText("Unable to update concept positions.")
    ).not.toBeVisible({ timeout: 1_500 });
  });
});

import { expect, test } from "@playwright/test";

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
    const pos = await page.evaluate(() => {
      const sigma = (window as any).__SIGMA__;
      return sigma.getNodeDisplayData("node-a");
    });
    
    await page.locator(".sigma-mouse").click({ position: { x: pos.x, y: pos.y } });

    await expect(page.getByTestId("last-action")).toHaveText(/Inspect Concept/);
    await expect(page.getByTestId("selection")).toHaveText("Selection: concept");
  });

  test("Placing a Concept updates the interaction state", async ({ page }) => {
    await page.getByTestId("set-mode-concept").click();
    await expect(page.getByTestId("current-mode")).toHaveText("Mode: placeConcept");

    // Click empty canvas space mapped to 100,100 from top-left
    await page.locator(".sigma-mouse").click({ position: { x: 100, y: 100 } });

    await expect(page.getByTestId("last-action")).toHaveText(/Create Concept at/);
    await expect(page.getByTestId("selection")).toHaveText("Selection: create-concept");
  });

  test("Connecting a Link updates the interaction state", async ({ page }) => {
    await page.getByTestId("set-mode-link").click();
    await expect(page.getByTestId("current-mode")).toHaveText("Mode: connectLink");

    const posA = await page.evaluate(() => {
      return (window as any).__SIGMA__.getNodeDisplayData("node-a");
    });
    const posB = await page.evaluate(() => {
      return (window as any).__SIGMA__.getNodeDisplayData("node-b");
    });

    // Click Node A (Source)
    await page.locator(".sigma-mouse").click({ position: { x: posA.x, y: posA.y } });
    await expect(page.getByTestId("last-action")).toHaveText(/Picked Connect Source/);

    // Click Node B (Target)
    await page.locator(".sigma-mouse").click({ position: { x: posB.x, y: posB.y } });
    await expect(page.getByTestId("last-action")).toHaveText(/Completed Link/);
    await expect(page.getByTestId("selection")).toHaveText("Selection: create-link");
  });
});

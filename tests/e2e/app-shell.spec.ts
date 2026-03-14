import { expect, test } from "@playwright/test";

test.describe("marketing shell", () => {
  test("renders the stable product positioning copy", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Build an explainable map of a person.",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
  });

  test("allows page scroll on content-heavy surfaces", async ({ page }) => {
    await page.goto("/");

    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0);

    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(150);

    const afterScrollY = await page.evaluate(() => window.scrollY);
    expect(afterScrollY).toBeGreaterThan(0);
  });
});

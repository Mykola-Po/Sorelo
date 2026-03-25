import { expect, test } from "@playwright/test";

test.describe("marketing shell", () => {
  test("renders the stable product positioning copy", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "See why a person reacts the way they do.",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }).first()
    ).toBeVisible();
  });

  test("allows page scroll on content-heavy surfaces", async ({ page }) => {
    await page.goto("/");

    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0);

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const scrollingElement =
              document.scrollingElement ?? document.documentElement;
            return scrollingElement.scrollHeight - window.innerHeight;
          }),
        {
          timeout: 5_000,
          intervals: [50, 100, 150],
        }
      )
      .toBeGreaterThan(0);

    await page.evaluate(() => {
      window.scrollTo({
        top: Math.min(window.innerHeight, document.body.scrollHeight),
        behavior: "instant",
      });
    });
    await page.waitForTimeout(100);

    const afterScrollY = await page.evaluate(() => window.scrollY);
    expect(afterScrollY).toBeGreaterThan(0);
  });
});

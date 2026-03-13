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
});

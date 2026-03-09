import { expect, test } from "@playwright/test";

test.describe("marketing shell", () => {
  test("renders the stable product positioning copy", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("No endless page scroll.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
  });
});

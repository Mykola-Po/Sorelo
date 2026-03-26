import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => {
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;

    return {
      innerWidth: window.innerWidth,
      scrollWidth: scrollingElement.scrollWidth,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
}

async function expectNoBackdropBlur(page: Page, selector: string) {
  const backdropFilters = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const value = window.getComputedStyle(element).backdropFilter;
      return value && value !== "none" ? value : "none";
    })
  );

  expect(backdropFilters.every((value) => value === "none")).toBeTruthy();
}

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

  test("keeps hero hierarchy readable without blur-heavy chrome on desktop", async ({
    page,
  }) => {
    await page.goto("/");

    const topbar = page.locator(".marketing-topbar");
    const headline = page.getByRole("heading", {
      name: "See why a person reacts the way they do.",
    });
    const cta = page.getByRole("button", { name: "Continue with Google" }).first();
    const preview = page.locator(".marketing-hero-preview-shell");
    const proofCards = page.locator(".marketing-proof-card");

    await expect(topbar).toBeVisible();
    await expect(headline).toBeVisible();
    await expect(cta).toBeVisible();
    await expect(preview).toBeVisible();
    await expect(proofCards).toHaveCount(4);

    const [headlineBox, ctaBox, previewBox] = await Promise.all([
      headline.boundingBox(),
      cta.boundingBox(),
      preview.boundingBox(),
    ]);

    expect(headlineBox).not.toBeNull();
    expect(ctaBox).not.toBeNull();
    expect(previewBox).not.toBeNull();

    if (!headlineBox || !ctaBox || !previewBox) {
      return;
    }

    expect(Math.abs(headlineBox.y - previewBox.y)).toBeLessThan(220);
    expect(ctaBox.y).toBeGreaterThan(headlineBox.y + headlineBox.height * 0.6);
    expect(previewBox.width).toBeGreaterThan(420);

    await expectNoBackdropBlur(
      page,
      ".marketing-topbar, .marketing-preview-shell, .marketing-proof-card"
    );
  });
});

test.describe("marketing shell mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("stacks hero content cleanly on mobile without visual clutter", async ({
    page,
  }) => {
    await page.goto("/");

    const headline = page.getByRole("heading", {
      name: "See why a person reacts the way they do.",
    });
    const cta = page.getByRole("button", { name: "Continue with Google" }).first();
    const preview = page.locator(".marketing-hero-preview-shell");
    const proofCards = page.locator(".marketing-proof-card");

    await expect(headline).toBeVisible();
    await expect(cta).toBeVisible();
    await expect(preview).toBeVisible();
    await expect(proofCards).toHaveCount(4);

    const [ctaBox, previewBox] = await Promise.all([
      cta.boundingBox(),
      preview.boundingBox(),
    ]);

    expect(ctaBox).not.toBeNull();
    expect(previewBox).not.toBeNull();

    if (!ctaBox || !previewBox) {
      return;
    }

    expect(previewBox.y).toBeGreaterThan(ctaBox.y + ctaBox.height - 4);
    await expectNoHorizontalOverflow(page);
    await expectNoBackdropBlur(
      page,
      ".marketing-topbar, .marketing-preview-shell, .marketing-proof-card"
    );
  });
});

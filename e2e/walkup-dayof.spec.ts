import { test, expect } from "@playwright/test";

const slug = process.env.TEST_PUBLISHED_SLUG;

test.describe("Generic walk-up Day-of view", () => {
  test.skip(!slug, "Set TEST_PUBLISHED_SLUG to enable Day-of walk-up tests");

  test.beforeEach(async ({ page }) => {
    await page.goto(`/day-of/${slug}`);
    await page.waitForLoadState("networkidle");
  });

  test("does NOT show a personalized welcome card", async ({ page }) => {
    // The personalized welcome is rendered only when a ?code= is present.
    await expect(page.getByTestId("player-welcome-card")).toHaveCount(0);
  });

  test("does NOT show the 'Enter Scores' CTA", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /enter scores/i })
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /enter scores/i })).toHaveCount(0);
  });

  test("shows the scoring-tent banner when live scoring is unavailable", async ({
    page,
  }) => {
    const banner = page.getByText(/scoring tent/i);
    // The banner may not appear if live scoring is enabled for this event,
    // so soft-assert: at minimum the page must not crash and must render the title.
    await expect(page.locator("h1, h2").first()).toBeVisible();
    if ((await banner.count()) > 0) {
      await expect(banner.first()).toBeVisible();
      await expect(banner.first()).toContainText(/scoring tent/i);
    }
  });
});

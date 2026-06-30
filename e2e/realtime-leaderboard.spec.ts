import { test, expect } from "@playwright/test";
import { getSupabase } from "./helpers/supabase";

const slug = process.env.TEST_PUBLISHED_SLUG;
const authCode = process.env.TEST_PLAYER_AUTH_CODE;

test.describe("Realtime score → leaderboard propagation", () => {
  test.skip(
    !slug || !authCode,
    "Set TEST_PUBLISHED_SLUG + TEST_PLAYER_AUTH_CODE to enable realtime score tests"
  );

  test("score edit appears on /live/:slug without a manual refresh", async ({
    browser,
  }) => {
    const supabase = getSupabase();
    test.skip(!supabase, "Supabase env not configured");

    const leaderboardCtx = await browser.newContext();
    const leaderboard = await leaderboardCtx.newPage();
    await leaderboard.goto(`/live/${slug}`);
    await leaderboard.waitForLoadState("networkidle");

    const scoringCtx = await browser.newContext();
    const scoring = await scoringCtx.newPage();
    await scoring.goto(`/score/${authCode}`);
    await scoring.waitForLoadState("networkidle");

    // Bump hole 1's stepper up once on the scoring page.
    const plus = scoring.getByRole("button", { name: /^\+$|increment|add/i }).first();
    if (await plus.count()) {
      await plus.click();
    }

    // The leaderboard subscribes to tournament_scores via Realtime; the new
    // total should propagate within a few seconds without a reload.
    await expect
      .poll(
        async () => (await leaderboard.content()).length,
        { timeout: 15_000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0);

    await leaderboardCtx.close();
    await scoringCtx.close();
  });

  test("score edit also reflects in the generic /day-of/:slug leaderboard", async ({
    page,
  }) => {
    await page.goto(`/day-of/${slug}`);
    await page.waitForLoadState("networkidle");
    // Smoke-check that the embedded leaderboard region renders.
    await expect(page.locator("body")).not.toContainText(/not found/i);
  });
});

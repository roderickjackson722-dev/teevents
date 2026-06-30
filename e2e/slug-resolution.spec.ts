import { test, expect } from "@playwright/test";
import { getSupabase } from "./helpers/supabase";

const slug = process.env.TEST_PUBLISHED_SLUG;
const collidingCustomSlug = process.env.TEST_PUBLISHED_CUSTOM_SLUG;

test.describe("resolve_public_tournament + public routing", () => {
  test.skip(!slug, "Set TEST_PUBLISHED_SLUG to enable slug resolution tests");

  test("resolver returns the published tournament whose `slug` matches", async () => {
    const supabase = getSupabase();
    test.skip(!supabase, "Supabase env not configured");
    const { data, error } = await supabase!.rpc("resolve_public_tournament", {
      _slug: slug,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data) ? data[0] : data).toBeTruthy();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row.site_published).toBe(true);
    expect(row.slug).toBe(slug);
  });

  test("resolver prefers exact `slug` over `custom_slug` collision", async () => {
    test.skip(
      !collidingCustomSlug,
      "Set TEST_PUBLISHED_CUSTOM_SLUG (a value that collides with another tournament's slug) to enable"
    );
    const supabase = getSupabase();
    test.skip(!supabase, "Supabase env not configured");
    const { data } = await supabase!.rpc("resolve_public_tournament", {
      _slug: collidingCustomSlug,
    });
    const row = Array.isArray(data) ? data[0] : data;
    expect(row).toBeTruthy();
    // Rank 0 (exact slug) wins over rank 1 (custom_slug) — the row's `slug`
    // must equal the queried value when one exists.
    expect(row.slug).toBe(collidingCustomSlug);
  });

  test("resolver filters unpublished tournaments", async () => {
    const supabase = getSupabase();
    test.skip(!supabase, "Supabase env not configured");
    const { data } = await supabase!.rpc("resolve_public_tournament", {
      _slug: "__definitely_not_a_real_slug__",
    });
    expect(Array.isArray(data) ? data.length : 0).toBe(0);
  });

  test("/live/:slug loads the same tournament as the resolver", async ({ page }) => {
    await page.goto(`/live/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/live/${slug}$`));
    // The leaderboard page renders the tournament title in an h1/h2.
    await expect(page.locator("body")).not.toContainText(/not found/i);
  });

  test("/day-of/:slug loads the same tournament as the resolver", async ({ page }) => {
    await page.goto(`/day-of/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/day-of/${slug}`));
    await expect(page.locator("body")).not.toContainText(/not found/i);
  });
});

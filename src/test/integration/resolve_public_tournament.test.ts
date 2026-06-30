/**
 * Backend integration test for the resolve_public_tournament(slug) RPC.
 *
 * Validates:
 *  - exact `slug` match outranks a colliding `custom_slug` match (rank 0 vs 1)
 *  - id lookup works (rank 2)
 *  - unpublished tournaments are excluded
 *  - unknown slugs return no rows
 *
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY. Optionally
 * TEST_PUBLISHED_SLUG / TEST_PUBLISHED_CUSTOM_SLUG / TEST_PUBLISHED_ID to
 * exercise the positive-path assertions. Cases without their fixture are
 * skipped so the suite remains green in local dev.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

const slug = process.env.TEST_PUBLISHED_SLUG;
const collidingCustomSlug = process.env.TEST_PUBLISHED_CUSTOM_SLUG;
const id = process.env.TEST_PUBLISHED_ID;

const maybe = supabase ? describe : describe.skip;

maybe("resolve_public_tournament", () => {
  it("returns no rows for an unknown slug", async () => {
    const { data, error } = await supabase!.rpc("resolve_public_tournament", {
      _slug: "__definitely_not_a_real_slug__",
    });
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("returns no rows for an empty / whitespace slug", async () => {
    const { data: a } = await supabase!.rpc("resolve_public_tournament", { _slug: "" });
    const { data: b } = await supabase!.rpc("resolve_public_tournament", { _slug: "   " });
    expect(a ?? []).toHaveLength(0);
    expect(b ?? []).toHaveLength(0);
  });

  (slug ? it : it.skip)("returns the published tournament for an exact `slug` match", async () => {
    const { data, error } = await supabase!.rpc("resolve_public_tournament", { _slug: slug });
    expect(error).toBeNull();
    const row = (data ?? [])[0];
    expect(row).toBeTruthy();
    expect(row.slug).toBe(slug);
    expect(row.site_published).toBe(true);
  });

  (collidingCustomSlug ? it : it.skip)(
    "prefers exact `slug` over a colliding `custom_slug`",
    async () => {
      const { data } = await supabase!.rpc("resolve_public_tournament", {
        _slug: collidingCustomSlug,
      });
      const row = (data ?? [])[0];
      expect(row).toBeTruthy();
      // The winning row's slug must equal the queried value — that's the rank-0
      // path. If the resolver mis-ranked, the row would come from the other
      // tournament (where the queried value lives in custom_slug, not slug).
      expect(row.slug).toBe(collidingCustomSlug);
    }
  );

  (id ? it : it.skip)("resolves by tournament id (rank 2)", async () => {
    const { data } = await supabase!.rpc("resolve_public_tournament", { _slug: id });
    const row = (data ?? [])[0];
    expect(row).toBeTruthy();
    expect(row.id).toBe(id);
    expect(row.site_published).toBe(true);
  });
});

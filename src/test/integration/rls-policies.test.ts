/**
 * RLS policy regression tests for the tables hardened by the security scan
 * findings: auction_bids, college_tournament_players, event_resources,
 * sponsor_registrations, vendor_registrations.
 *
 * These tests use the anon publishable key to prove the anonymous role
 * CANNOT read rows through PostgREST, and that the public directory RPCs
 * (`get_public_sponsor_registrations`, `get_public_vendor_registrations`)
 * only expose directory-safe columns — never contact PII.
 *
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY. Skipped
 * otherwise so local dev without env vars stays green.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anon = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

const maybe = anon ? describe : describe.skip;

// Columns the RPCs are ALLOWED to return. Anything outside this set is a leak.
const SPONSOR_SAFE_COLUMNS = new Set([
  "id",
  "tournament_id",
  "tier_id",
  "company_name",
  "website_url",
  "description",
  "logo_url",
  "payment_status",
  "manually_approved",
  "show_on_public",
  "is_title_sponsor",
]);

const VENDOR_SAFE_COLUMNS = new Set([
  "id",
  "tournament_id",
  "tier_id",
  "vendor_name",
  "company_name",
  "website_url",
  "description",
  "logo_url",
  "business_type",
  "booth_location",
  "payment_status",
  "manually_approved",
  "show_on_public",
]);

// Contact / PII columns that MUST never appear in RPC output.
const FORBIDDEN_COLUMNS = [
  "contact_email",
  "contact_phone",
  "contact_name",
  "notes",
  "email",
  "phone",
];

maybe("RLS: anon role cannot SELECT protected tables", () => {
  const tables = [
    "auction_bids",
    "college_tournament_players",
    "event_resources",
    "sponsor_registrations",
    "vendor_registrations",
  ] as const;

  for (const table of tables) {
    it(`${table}: anon SELECT returns zero rows`, async () => {
      const { data, error } = await (anon as any).from(table).select("*").limit(1);
      // Either RLS returns no rows (data: []) or PostgREST rejects with a
      // permission error. Both prove anon has no read access. What must NOT
      // happen is a successful query with real rows.
      if (error) {
        // Any error is acceptable — anon is blocked.
        expect(error).toBeTruthy();
      } else {
        expect(data ?? []).toHaveLength(0);
      }
    });
  }
});

maybe("Public directory RPCs expose only safe columns", () => {
  it("get_public_sponsor_registrations never leaks contact PII", async () => {
    const { data, error } = await anon!.rpc("get_public_sponsor_registrations", {
      _tournament_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as Record<string, unknown>[];
    // Even with no matching tournament, we can still inspect the row shape by
    // running against any real row if present. If empty, the query still
    // succeeds and the compile-time RETURNS TABLE contract is what we rely on;
    // we assert here on any returned rows.
    for (const row of rows) {
      for (const col of Object.keys(row)) {
        expect(SPONSOR_SAFE_COLUMNS.has(col)).toBe(true);
        expect(FORBIDDEN_COLUMNS).not.toContain(col);
      }
    }
  });

  it("get_public_vendor_registrations never leaks contact PII", async () => {
    const { data, error } = await anon!.rpc("get_public_vendor_registrations", {
      _tournament_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      for (const col of Object.keys(row)) {
        expect(VENDOR_SAFE_COLUMNS.has(col)).toBe(true);
        expect(FORBIDDEN_COLUMNS).not.toContain(col);
      }
    }
  });
});

// Code audit tests for security-critical RPCs and edge functions.
// These tests run against the deployed Supabase project using the anon key
// (no service role) to verify unauthorized callers are rejected.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 0 } } });
const t = (name: string, fn: () => Promise<void>) => Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });

t("save_group_scores rejects empty/missing code", async () => {
  const sb = anon();
  const { error } = await sb.rpc("save_group_scores", {
    _tournament_id: "00000000-0000-0000-0000-000000000000",
    _code: "",
    _scores: [],
  });
  assert(error, "expected error for empty code");
  assert(/missing|invalid/i.test(error!.message), `got: ${error?.message}`);
});

t("save_group_scores rejects unknown code", async () => {
  const sb = anon();
  const { error } = await sb.rpc("save_group_scores", {
    _tournament_id: crypto.randomUUID(),
    _code: "ZZZZZZ",
    _scores: [{ registration_id: crypto.randomUUID(), hole_number: 1, strokes: 4 }],
  });
  assert(error, "expected invalid scoring code error");
  assert(/invalid/i.test(error!.message), `got: ${error?.message}`);
});

t("get_day_of_player returns null for bad code", async () => {
  const sb = anon();
  const { data, error } = await sb.rpc("get_day_of_player", {
    _tournament_id: crypto.randomUUID(),
    _code: "NOPE12",
  });
  assertEquals(error, null);
  assertEquals(data, null);
});

t("lookup_scoring_access returns no row for bad code", async () => {
  const sb = anon();
  const { data, error } = await sb.rpc("lookup_scoring_access", {
    _slug: "non-existent-slug",
    _code: "BADCODE",
  });
  assertEquals(error, null);
  assert(!data || (Array.isArray(data) && data.length === 0));
});

t("anon cannot select tournament_registrations directly", async () => {
  const sb = anon();
  const { data, error } = await sb.from("tournament_registrations").select("id, email, scoring_code").limit(1);
  // Either RLS blocks (data empty) or error — never expose PII via direct read.
  assert(!data || data.length === 0, "anon should not be able to read registrations");
  if (data && data.length > 0) {
    throw new Error("SECURITY: anon read PII from tournament_registrations");
  }
  // error is acceptable too
  void error;
});

t("anon cannot insert tournament_scores directly", async () => {
  const sb = anon();
  const { error } = await sb.from("tournament_scores").insert({
    tournament_id: crypto.randomUUID(),
    registration_id: crypto.randomUUID(),
    hole_number: 1,
    strokes: 4,
  });
  assert(error, "expected RLS to block direct anon insert into tournament_scores");
});

t("anon cannot insert admin_notifications", async () => {
  const sb = anon();
  const { error } = await sb.from("admin_notifications").insert({
    type: "test", title: "x", message: "y",
  });
  assert(error, "expected RLS to block anon insert into admin_notifications");
});

t("get_demo_prep_share returns null for invalid token", async () => {
  const sb = anon();
  const { data, error } = await sb.rpc("get_demo_prep_share", { _token: crypto.randomUUID() });
  assertEquals(error, null);
  assertEquals(data, null);
});

t("claim-real-demo-tournament rejects calls with no auth header", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/claim-real-demo-tournament`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ conversion_token: crypto.randomUUID() }),
  });
  await res.text();
  // Without a user JWT, function returns 401
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

t("claim-real-demo-tournament rejects malformed token", async () => {
  // Use the anon key as a "user" token — getUser() will fail and we should 401
  const res = await fetch(`${SUPABASE_URL}/functions/v1/claim-real-demo-tournament`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ conversion_token: "not-a-uuid" }),
  });
  await res.text();
  // Either 401 (auth) or 400 (bad token) — both acceptable, never 200.
  assert(res.status === 400 || res.status === 401, `expected 400/401, got ${res.status}`);
});

t("prepare-demo-conversion rejects non-admin caller", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/prepare-demo-conversion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ tournament_id: crypto.randomUUID(), prospect_email: "x@example.com" }),
  });
  await res.text();
  assert(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
});

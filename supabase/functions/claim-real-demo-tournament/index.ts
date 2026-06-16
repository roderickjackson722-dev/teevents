// Authenticated prospect claims a converted real-demo tournament:
// - Validates the conversion token is non-empty, well-formed, NOT expired, and NOT used.
// - Atomically marks the token as used to prevent replay/race claims.
// - Creates a new organization, adds them as owner, reassigns the tournament,
//   and clears the demo flag.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { conversion_token, organization_name } = await req.json();
    if (!conversion_token || typeof conversion_token !== "string" || !UUID_RE.test(conversion_token)) {
      return new Response(JSON.stringify({ error: "Invalid claim link" }), { status: 400, headers: corsHeaders });
    }
    const orgNameInput = typeof organization_name === "string"
      ? organization_name.trim().slice(0, 200)
      : null;

    // Look up the demo tournament
    const { data: t, error: tErr } = await admin
      .from("tournaments")
      .select("id, title, is_demo, demo_converted_at, demo_conversion_used_at, demo_conversion_token_expires_at, demo_prospect_name, demo_conversion_is_test, demo_conversion_discount_type, demo_conversion_discount_value")
      .eq("demo_conversion_token", conversion_token)
      .maybeSingle();
    if (tErr || !t) {
      return new Response(JSON.stringify({ error: "Invalid or expired claim link" }), { status: 404, headers: corsHeaders });
    }
    if (!t.is_demo) {
      return new Response(JSON.stringify({ error: "Not a demo tournament" }), { status: 400, headers: corsHeaders });
    }
    if (t.demo_converted_at || t.demo_conversion_used_at) {
      return new Response(JSON.stringify({ error: "This tournament has already been claimed" }), { status: 409, headers: corsHeaders });
    }
    if (t.demo_conversion_token_expires_at && new Date(t.demo_conversion_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This claim link has expired" }), { status: 410, headers: corsHeaders });
    }

    const nowIso = new Date().toISOString();
    const isTest = !!t.demo_conversion_is_test;

    // Atomically claim the token
    const { data: claimed, error: claimErr } = await admin
      .from("tournaments")
      .update({
        demo_conversion_used_at: nowIso,
        demo_conversion_claimed_by: user.id,
        demo_conversion_claimed_at: nowIso,
      })
      .eq("id", t.id)
      .eq("demo_conversion_token", conversion_token)
      .is("demo_conversion_used_at", null)
      .is("demo_converted_at", null)
      .select("id");
    if (claimErr) throw claimErr;
    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ error: "This tournament has already been claimed" }), { status: 409, headers: corsHeaders });
    }

    // TEST MODE: mark the demo as test-converted, do NOT transfer org, do NOT wipe
    // (we already preserved data on send). Reopen for further testing.
    if (isTest) {
      await admin
        .from("tournaments")
        .update({
          demo_test_converted_at: nowIso,
          // Reopen token slot so admin can re-issue a new test link later
          demo_conversion_token: null,
          demo_conversion_token_expires_at: null,
          demo_conversion_used_at: null,
          demo_conversion_is_test: false,
        })
        .eq("id", t.id);
      return new Response(JSON.stringify({
        ok: true, test: true, tournament_id: t.id,
        message: "Test claim succeeded. Demo preserved for further testing.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Real claim — create org, transfer tournament
    const orgName = orgNameInput || t.demo_prospect_name || `${t.title} Org`;
    const { data: org, error: orgErr } = await admin
      .from("organizations").insert({ name: orgName, plan: "base" }).select().single();
    if (orgErr) throw orgErr;

    const { error: memErr } = await admin
      .from("org_members").insert({ user_id: user.id, organization_id: org.id, role: "owner" });
    if (memErr) throw memErr;

    const { error: updErr } = await admin
      .from("tournaments")
      .update({
        organization_id: org.id,
        is_demo: false,
        demo_conversion_token: null,
        demo_conversion_token_expires_at: null,
        demo_converted_at: nowIso,
      })
      .eq("id", t.id);
    if (updErr) throw updErr;

    // Mark discount as used (consumed when prospect claims). The future
    // Pro-checkout flow can read it via get_demo_conversion_discount() before
    // marking used; here we record the claim event.
    await admin
      .from("demo_conversion_discounts")
      .update({ used: true, used_at: nowIso, used_by: user.id })
      .eq("conversion_token", conversion_token);

    return new Response(JSON.stringify({
      ok: true, tournament_id: t.id, organization_id: org.id,
      discount: t.demo_conversion_discount_type && t.demo_conversion_discount_type !== "none" ? {
        type: t.demo_conversion_discount_type, value: t.demo_conversion_discount_value,
      } : null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
      .select("id, title, is_demo, demo_converted_at, demo_conversion_used_at, demo_conversion_token_expires_at, demo_prospect_name")
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

    // Atomically claim the token: only one caller wins. We update the row
    // gated on token + not-yet-used + not-yet-expired, and require exactly 1
    // row affected. If 0 rows come back, someone else already claimed it.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimErr } = await admin
      .from("tournaments")
      .update({ demo_conversion_used_at: nowIso })
      .eq("id", t.id)
      .eq("demo_conversion_token", conversion_token)
      .is("demo_conversion_used_at", null)
      .is("demo_converted_at", null)
      .select("id");
    if (claimErr) throw claimErr;
    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ error: "This tournament has already been claimed" }), { status: 409, headers: corsHeaders });
    }

    // Create the organization + owner membership, then transfer the tournament.
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

    return new Response(JSON.stringify({ ok: true, tournament_id: t.id, organization_id: org.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

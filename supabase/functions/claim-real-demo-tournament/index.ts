// Authenticated prospect claims a converted real-demo tournament:
// creates a new organization, adds them as owner, reassigns the tournament,
// and clears the demo flag + conversion token.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!conversion_token) {
      return new Response(JSON.stringify({ error: "conversion_token required" }), { status: 400, headers: corsHeaders });
    }

    const { data: t, error: tErr } = await admin
      .from("tournaments")
      .select("id, title, is_demo, demo_converted_at, demo_prospect_name")
      .eq("demo_conversion_token", conversion_token)
      .maybeSingle();
    if (tErr || !t) {
      return new Response(JSON.stringify({ error: "Invalid or expired claim link" }), { status: 404, headers: corsHeaders });
    }
    if (t.demo_converted_at) {
      return new Response(JSON.stringify({ error: "This tournament has already been claimed" }), { status: 409, headers: corsHeaders });
    }

    const orgName = organization_name || t.demo_prospect_name || `${t.title} Org`;
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
        demo_converted_at: new Date().toISOString(),
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

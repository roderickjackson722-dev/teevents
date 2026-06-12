// Authenticated: prospect (already signed up) claims a converted demo.
// Creates a real organization + org_members owner row + tournaments row,
// then archives the demo.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tournament";
}

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

    const { data: demo, error: demoErr } = await admin
      .from("demo_tournaments")
      .select("*")
      .eq("conversion_token", conversion_token)
      .maybeSingle();
    if (demoErr || !demo) {
      return new Response(JSON.stringify({ error: "Invalid or expired claim link" }), { status: 404, headers: corsHeaders });
    }
    if (demo.status === "archived" && demo.live_tournament_id) {
      return new Response(JSON.stringify({ error: "This tournament has already been claimed" }), { status: 409, headers: corsHeaders });
    }

    // 1. Create organization
    const orgName = organization_name || demo.prospect_name || `${demo.tournament_name} Org`;
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({ name: orgName, plan: "base" })
      .select()
      .single();
    if (orgErr) throw orgErr;

    // 2. Owner membership
    const { error: memErr } = await admin
      .from("org_members")
      .insert({ user_id: user.id, organization_id: org.id, role: "owner" });
    if (memErr) throw memErr;

    // 3. Real tournament row
    const baseSlug = slugify(demo.tournament_name);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: tourn, error: tournErr } = await admin
      .from("tournaments")
      .insert({
        organization_id: org.id,
        title: demo.tournament_name,
        date: demo.event_date,
        location: demo.location,
        course_name: demo.course_name,
        registration_fee_cents: demo.registration_fee_cents ?? 0,
        scoring_format: demo.scoring_format || "Scramble",
        site_published: false,
        slug,
      })
      .select()
      .single();
    if (tournErr) throw tournErr;

    // 4. Mark demo archived + linked. Clear mock data so the live record is clean.
    await admin.from("demo_players").delete().eq("demo_tournament_id", demo.id);
    await admin.from("demo_sponsors").delete().eq("demo_tournament_id", demo.id);
    await admin.from("demo_scores").delete().eq("demo_tournament_id", demo.id);
    await admin
      .from("demo_tournaments")
      .update({ status: "archived", live_tournament_id: tourn.id })
      .eq("id", demo.id);

    return new Response(JSON.stringify({ ok: true, tournament: tourn, organization: org }), {
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

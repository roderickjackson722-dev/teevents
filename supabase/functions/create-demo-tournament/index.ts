// Admin-only: creates a demo tournament row + seeds mock players/sponsors/scores.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MOCK_PLAYERS, MOCK_SPONSORS, buildMockScoreRows } from "../_shared/demoMockData.ts";

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
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const {
      tournament_name,
      event_date,
      location,
      course_name,
      registration_fee_cents = 0,
      scoring_format = "Scramble",
      generate_players = true,
      generate_sponsors = true,
      generate_scores = true,
    } = body || {};

    if (!tournament_name) {
      return new Response(JSON.stringify({ error: "tournament_name required" }), { status: 400, headers: corsHeaders });
    }

    const { data: demo, error: demoErr } = await admin
      .from("demo_tournaments")
      .insert({
        admin_id: user.id,
        tournament_name,
        event_date: event_date || null,
        location: location || null,
        course_name: course_name || null,
        registration_fee_cents,
        scoring_format,
      })
      .select()
      .single();
    if (demoErr) throw demoErr;

    if (generate_players) {
      await admin.from("demo_players").insert(MOCK_PLAYERS.map((p) => ({ ...p, demo_tournament_id: demo.id })));
    }
    if (generate_sponsors) {
      await admin.from("demo_sponsors").insert(MOCK_SPONSORS.map((s) => ({ ...s, demo_tournament_id: demo.id })));
    }
    if (generate_scores) {
      await admin.from("demo_scores").insert(buildMockScoreRows(demo.id));
    }

    return new Response(JSON.stringify({ demo }), {
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

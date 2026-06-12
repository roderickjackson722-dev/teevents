// Admin-only: add or remove subsets of mock data on a demo tournament.
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

    const { demo_id, action, kind } = await req.json();
    // action: 'add'|'remove'|'reset'  kind: 'players'|'sponsors'|'scores'|'all'

    if (!demo_id || !action) {
      return new Response(JSON.stringify({ error: "demo_id and action required" }), { status: 400, headers: corsHeaders });
    }

    const kinds = kind === "all" || !kind ? ["players", "sponsors", "scores"] : [kind];

    if (action === "remove" || action === "reset") {
      for (const k of kinds) {
        const table = k === "players" ? "demo_players" : k === "sponsors" ? "demo_sponsors" : "demo_scores";
        await admin.from(table).delete().eq("demo_tournament_id", demo_id);
      }
    }
    if (action === "add" || action === "reset") {
      for (const k of kinds) {
        if (k === "players") {
          await admin.from("demo_players").insert(MOCK_PLAYERS.map((p) => ({ ...p, demo_tournament_id: demo_id })));
        } else if (k === "sponsors") {
          await admin.from("demo_sponsors").insert(MOCK_SPONSORS.map((s) => ({ ...s, demo_tournament_id: demo_id })));
        } else if (k === "scores") {
          await admin.from("demo_scores").insert(buildMockScoreRows(demo_id));
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
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

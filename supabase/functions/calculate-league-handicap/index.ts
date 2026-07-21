// Recalculates WHS Handicap Index for a single league member or for every
// member in a league. Called on-demand by the dashboard and by the scheduled
// cron job that runs after new scores are posted.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as any));
    const { member_id, league_id, all } = body || {};

    if (member_id) {
      const { data, error } = await admin.rpc("recalculate_member_handicap", { _member_id: member_id });
      if (error) throw error;
      return json({ ok: true, member_id, handicap_index: data });
    }

    if (league_id) {
      const { data, error } = await admin.rpc("recalculate_league_handicaps", { _league_id: league_id });
      if (error) throw error;
      return json({ ok: true, league_id, members_recalculated: data });
    }

    if (all) {
      // Scheduled run: recompute every league that had scores in the last 7 days.
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: recent, error: rErr } = await admin
        .from("league_event_scores")
        .select("member_id")
        .gte("entered_at", since);
      if (rErr) throw rErr;

      const uniqueMembers = Array.from(new Set((recent || []).map((r: any) => r.member_id)));
      let ok = 0;
      for (const m of uniqueMembers) {
        const { error } = await admin.rpc("recalculate_member_handicap", { _member_id: m });
        if (!error) ok++;
      }
      return json({ ok: true, scheduled: true, members_recalculated: ok, scanned: uniqueMembers.length });
    }

    return json({ error: "Provide member_id, league_id, or all=true" }, 400);
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

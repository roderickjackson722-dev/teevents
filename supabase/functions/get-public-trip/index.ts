import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") throw new Error("Invalid token");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: trip } = await supabase.from("golf_trips").select("*").eq("share_token", token).maybeSingle();
    if (!trip) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (trip.is_published === false) {
      return new Response(JSON.stringify({ error: "This trip is not currently published." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [participants, agenda, tee_times, rooms, skins] = await Promise.all([
      supabase.from("trip_participants").select("id, name, handicap_index").eq("trip_id", trip.id),
      supabase.from("trip_agenda").select("*").eq("trip_id", trip.id).order("day").order("time"),
      supabase.from("trip_tee_times").select("*").eq("trip_id", trip.id).order("day").order("tee_time"),
      supabase.from("trip_rooms").select("*").eq("trip_id", trip.id).order("room_number"),
      supabase.from("trip_skins").select("winning_participant_id, amount_cents").eq("trip_id", trip.id),
    ]);

    const totals: Record<string, { cents: number; skins: number }> = {};
    (skins.data || []).forEach((s: any) => {
      if (!s.winning_participant_id) return;
      totals[s.winning_participant_id] = totals[s.winning_participant_id] || { cents: 0, skins: 0 };
      totals[s.winning_participant_id].cents += s.amount_cents || 0;
      totals[s.winning_participant_id].skins += 1;
    });
    const skins_leaderboard = (participants.data || [])
      .map((p: any) => ({ name: p.name, ...(totals[p.id] || { cents: 0, skins: 0 }) }))
      .sort((a: any, b: any) => b.cents - a.cents);

    // Public payload: omit organizer_id, internal payment data
    const { organizer_id, ...publicTrip } = trip;

    return new Response(JSON.stringify({
      trip: publicTrip,
      participants: participants.data || [],
      agenda: agenda.data || [],
      tee_times: tee_times.data || [],
      rooms: rooms.data || [],
      skins_leaderboard,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

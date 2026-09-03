// Public snapshot of a tournament in sample mode, keyed by sample_token.
// Uses service role to read data but only returns it when is_sample = true.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token) {
      const body = await safeJson(req);
      token = body?.token || null;
    }
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return json({ error: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: t, error: tErr } = await supabase
      .from("tournaments")
      .select("*")
      .eq("sample_token", token)
      .eq("is_sample", true)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!t) return json({ error: "not_found" }, 404);

    // Bump view count (fire-and-forget)
    supabase.rpc("bump_sample_view", { _token: token }).then(() => {});

    const tId = t.id;
    const [orgRes, regsRes, sponsorsRes, scoresRes, txRes, volRes] = await Promise.all([
      supabase.from("organizations").select("id, name, dashboard_name, logo_url").eq("id", t.organization_id).maybeSingle(),
      supabase.from("tournament_registrations").select("id, first_name, last_name, email, handicap, payment_status, created_at, shirt_size, dietary_restrictions").eq("tournament_id", tId).limit(300),
      supabase.from("tournament_sponsors").select("id, name, logo_url").eq("tournament_id", tId).limit(100),
      supabase.from("tournament_scores").select("*").eq("tournament_id", tId).limit(200),
      supabase.from("platform_transactions").select("id, amount_cents, platform_fee_cents, status, created_at, description").eq("tournament_id", tId).limit(200),
      supabase.from("tournament_volunteers").select("id, name, email, status").eq("tournament_id", tId).limit(100),
    ]);

    const safeTournament = {
      id: t.id,
      title: t.title,
      date: t.date,
      course_name: t.course_name,
      location: t.location,
      registration_fee_cents: t.registration_fee_cents,
      max_players: t.max_players,
      description: t.description,
      site_published: t.site_published,
      registration_open: t.registration_open,
      slug: t.custom_slug || t.slug,
      is_sample: t.is_sample,
      sample_view_count: t.sample_view_count,
      sample_last_viewed: t.sample_last_viewed,
    };

    return json({
      tournament: safeTournament,
      organization: orgRes.data || null,
      registrations: regsRes.data || [],
      sponsors: sponsorsRes.data || [],
      scores: scoresRes.data || [],
      transactions: txRes.data || [],
      volunteers: volRes.data || [],
    });
  } catch (e) {
    console.error("sample-tournament-snapshot error", e);
    return json({ error: "server_error", details: String((e as any)?.message || e) }, 500);
  }
});

async function safeJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

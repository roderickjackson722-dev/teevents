// Admin-only: disable sample mode on a tournament and attach an organizer as owner.
// Sends the standard tournament invitation email with temporary password.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);

    const adminUserId = claims.claims.sub;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: adminUserId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const tournamentId = body.tournament_id;
    const email = (body.email || "").trim().toLowerCase();
    if (!tournamentId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "invalid_input" }, 400);
    }

    // Load tournament
    const { data: t, error: tErr } = await supabase
      .from("tournaments")
      .select("id, title, organization_id, is_sample")
      .eq("id", tournamentId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!t) return json({ error: "not_found" }, 404);

    // Attach organizer via existing admin-attach-organizer function.
    const gwUrl = Deno.env.get("SUPABASE_URL")!;
    const attachRes = await fetch(`${gwUrl}/functions/v1/admin-attach-organizer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        tournament_id: tournamentId,
        email,
        role: "owner",
        create_if_missing: true,
      }),
    });
    const attachData = await attachRes.json().catch(() => ({}));
    if (!attachRes.ok || attachData?.error) {
      return json({ error: "attach_failed", details: attachData }, 500);
    }

    // Flip sample flags
    const { error: uErr } = await supabase
      .from("tournaments")
      .update({
        is_sample: false,
        is_converted_from_sample: true,
        sample_converted_at: new Date().toISOString(),
        sample_converted_to: attachData?.user_id ?? null,
      })
      .eq("id", tournamentId);
    if (uErr) throw uErr;

    // Fire the standard tournament invitation email (temp password) via existing function.
    // Failure here is non-fatal — the account already exists and is attached.
    try {
      await fetch(`${gwUrl}/functions/v1/admin-send-tournament-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ tournament_id: tournamentId, email }),
      });
    } catch (_) { /* non-fatal */ }

    return json({
      ok: true,
      email,
      user_id: attachData?.user_id ?? null,
      temp_password: attachData?.temp_password ?? null,
    });
  } catch (e) {
    console.error("admin-convert-sample-tournament error", e);
    return json({ error: "server_error", details: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

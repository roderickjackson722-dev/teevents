// Admin-only: marks a real demo tournament as converted, generates a one-time
// conversion token, deletes all mock data (registrations, scores, sponsors),
// and emails the prospect a claim/signup link.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FROM = "TeeVents <info@notifications.teevents.golf>";

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

    const { tournament_id, prospect_email, prospect_name, app_base_url } = await req.json();
    if (!tournament_id || !prospect_email) {
      return new Response(JSON.stringify({ error: "tournament_id and prospect_email required" }), { status: 400, headers: corsHeaders });
    }

    const { data: t, error: tErr } = await admin
      .from("tournaments").select("id, title, is_demo, demo_conversion_token").eq("id", tournament_id).maybeSingle();
    if (tErr || !t) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: corsHeaders });
    if (!t.is_demo) return new Response(JSON.stringify({ error: "Not a demo tournament" }), { status: 400, headers: corsHeaders });

    // Wipe mock data
    await admin.from("tournament_scores").delete().eq("tournament_id", tournament_id);
    await admin.from("tournament_registrations").delete().eq("tournament_id", tournament_id);
    await admin.from("tournament_sponsors").delete().eq("tournament_id", tournament_id);

    const token = t.demo_conversion_token || crypto.randomUUID();
    const { error: updErr } = await admin
      .from("tournaments")
      .update({
        demo_conversion_token: token,
        demo_conversion_sent_at: new Date().toISOString(),
        demo_prospect_email: prospect_email,
        demo_prospect_name: prospect_name || null,
      })
      .eq("id", tournament_id);
    if (updErr) throw updErr;

    const baseUrl = app_base_url || "https://teevents.golf";
    const claimUrl = `${baseUrl}/claim-demo/${token}`;
    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.55">
  <h2 style="color:#1a5c38;margin:0 0 16px">Claim your tournament</h2>
  <p>Hi ${prospect_name || "there"},</p>
  <p>Thanks for your time today. Your tournament <strong>${t.title}</strong> is ready to be claimed.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${claimUrl}" style="background:#F5A623;color:#1a5c38;font-weight:700;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block">Claim Your Tournament</a>
  </p>
  <p>This link will:</p>
  <ul>
    <li>Create your organizer account</li>
    <li>Give you full ownership of the tournament</li>
    <li>Keep all settings (date, fees, course details, branding)</li>
  </ul>
  <p>Questions? Just reply to this email.</p>
  <p style="margin-top:24px">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>
</div>`;
    const text = `Hi ${prospect_name || "there"},\n\nClaim your tournament "${t.title}" here:\n${claimUrl}\n\n— Rod Jackson, TeeVents Golf`;

    let emailResult: any = { skipped: true };
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [prospect_email],
          subject: `Claim your tournament – ${t.title}`,
          html,
          text,
        }),
      });
      emailResult = await r.json();
    }

    return new Response(JSON.stringify({ ok: true, claimUrl, token, email: emailResult }), {
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

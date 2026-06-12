// Admin-only: marks a demo as converted, generates a one-time conversion token,
// and sends the prospect the claim email. The real tournament row is created
// later when the prospect completes signup via claim-converted-tournament.
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
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

    const { demo_id, prospect_email, prospect_name, app_base_url } = await req.json();
    if (!demo_id || !prospect_email) {
      return new Response(JSON.stringify({ error: "demo_id and prospect_email required" }), { status: 400, headers: corsHeaders });
    }

    const { data: demo, error: demoErr } = await admin
      .from("demo_tournaments").select("*").eq("id", demo_id).maybeSingle();
    if (demoErr || !demo) {
      return new Response(JSON.stringify({ error: "Demo not found" }), { status: 404, headers: corsHeaders });
    }

    const conversion_token = crypto.randomUUID();
    const { error: updErr } = await admin
      .from("demo_tournaments")
      .update({
        status: "converted",
        prospect_email,
        prospect_name: prospect_name || null,
        conversion_token,
        converted_at: new Date().toISOString(),
      })
      .eq("id", demo_id);
    if (updErr) throw updErr;

    const baseUrl = app_base_url || "https://teevents.golf";
    const claimUrl = `${baseUrl}/claim/${conversion_token}`;

    const text = `Hi ${prospect_name || "there"},

Your demo tournament "${demo.tournament_name}" is ready to be claimed and turned into your live event.

Click the link below to complete your account setup and become the tournament organizer:

${claimUrl}

This link will:
• Create your organizer account
• Give you full ownership of the tournament
• Remove all mock data (players, sponsors, scores)
• Keep all your tournament settings (dates, fees, course details)

Once you complete signup, you can start inviting real players and running your tournament.

Questions? Just reply to this email.

Best,
Rod Jackson
TeeVents Golf`;

    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.55">
  <h2 style="color:#1a5c38;margin:0 0 16px">Claim your tournament</h2>
  <p>Hi ${prospect_name || "there"},</p>
  <p>Your demo tournament <strong>${demo.tournament_name}</strong> is ready to be claimed and turned into your live event.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${claimUrl}" style="background:#F5A623;color:#1a5c38;font-weight:700;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block">Claim Your Tournament</a>
  </p>
  <p>This link will:</p>
  <ul>
    <li>Create your organizer account</li>
    <li>Give you full ownership of the tournament</li>
    <li>Remove all mock data (players, sponsors, scores)</li>
    <li>Keep all your tournament settings (dates, fees, course details)</li>
  </ul>
  <p>Once you complete signup, you can start inviting real players and running your tournament.</p>
  <p>Questions? Just reply to this email.</p>
  <p style="margin-top:24px">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>
</div>`;

    let emailResult: any = { skipped: true };
    if (RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [prospect_email],
          subject: `Claim your tournament – ${demo.tournament_name}`,
          html,
          text,
        }),
      });
      emailResult = await r.json();
    }

    return new Response(JSON.stringify({ ok: true, conversion_token, claimUrl, email: emailResult }), {
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

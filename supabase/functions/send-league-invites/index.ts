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
    if (!authHeader) throw new Error("Missing authorization header");

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { league_id, emails } = await req.json();
    if (!league_id || !Array.isArray(emails) || emails.length === 0) throw new Error("league_id and emails required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: league } = await admin.from("golf_leagues").select("id, league_name, league_slug, organization_id, logo_url, tagline").eq("id", league_id).maybeSingle();
    if (!league) throw new Error("League not found");

    const { data: member } = await admin.from("org_members").select("user_id").eq("organization_id", league.organization_id).eq("user_id", user.id).maybeSingle();
    if (!member) throw new Error("Not authorized for this league");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("Email service not configured");

    const url = `https://teevents.golf/league/${league.league_slug}`;
    const results: any[] = [];
    for (const to of emails) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          ${league.logo_url ? `<img src="${league.logo_url}" alt="" style="height:56px;margin-bottom:12px" />` : ""}
          <h2 style="color:#1a5c38">You're invited to join ${league.league_name}</h2>
          ${league.tagline ? `<p style="color:#555">${league.tagline}</p>` : ""}
          <p>View the schedule, standings, and register for events on the league page:</p>
          <p><a href="${url}" style="background:#F5A623;color:#1a5c38;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Visit League Page</a></p>
          <p style="color:#888;font-size:12px;margin-top:24px">${url}</p>
        </div>
      `;
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to,
          subject: `You're invited to ${league.league_name}`,
          html,
        }),
      });
      results.push({ to, ok: resp.ok });
    }

    return new Response(JSON.stringify({ sent: results.filter((r) => r.ok).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

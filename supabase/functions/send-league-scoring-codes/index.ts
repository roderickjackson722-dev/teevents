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

    const { event_id, member_ids } = await req.json();
    if (!event_id) throw new Error("event_id required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: ev } = await admin
      .from("league_events")
      .select("id, event_name, event_date, format_type, holes, course_name, league_id, league_course_id")
      .eq("id", event_id)
      .maybeSingle();
    if (!ev) throw new Error("Event not found");

    const { data: league } = await admin
      .from("golf_leagues")
      .select("id, league_name, organization_id, logo_url")
      .eq("id", ev.league_id)
      .maybeSingle();
    if (!league) throw new Error("League not found");

    const { data: membership } = await admin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", league.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Not authorized for this league");

    let courseName: string | null = ev.course_name ?? null;
    if (ev.league_course_id) {
      const { data: c } = await admin.from("league_courses").select("course_name").eq("id", ev.league_course_id).maybeSingle();
      if (c?.course_name) courseName = c.course_name;
    }

    const { data: pairings } = await admin
      .from("league_team_pairings")
      .select("id, team_name, scoring_code, holes, player1_id, player2_id")
      .eq("event_id", event_id);

    const wanted: string[] = Array.isArray(member_ids) ? member_ids : [];
    const memberIds = new Set<string>();
    (pairings || []).forEach((p: any) => {
      [p.player1_id, p.player2_id].forEach((id: string | null) => {
        if (id && (wanted.length === 0 || wanted.includes(id))) memberIds.add(id);
      });
    });

    if (memberIds.size === 0) {
      return json({ sent: 0, results: [], error: "No matching players with scoring codes" }, 200);
    }

    const { data: members } = await admin
      .from("league_members")
      .select("id, member_name, email")
      .in("id", Array.from(memberIds));

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("Email service not configured");

    const results: any[] = [];
    for (const m of members || []) {
      if (!m.email) { results.push({ to: null, member_id: m.id, ok: false, error: "No email" }); continue; }
      const pairing = (pairings || []).find((p: any) => p.player1_id === m.id || p.player2_id === m.id);
      if (!pairing) continue;
      const holes = pairing.holes === 9 ? 9 : (ev.holes === 9 ? 9 : 18);
      const link = `https://teevents.golf/league-score/${pairing.scoring_code}`;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
          ${league.logo_url ? `<img src="${league.logo_url}" alt="" style="height:56px;margin-bottom:12px" />` : ""}
          <h2 style="color:#1a5c38;margin-bottom:4px">Your Scoring Code for ${ev.event_name} &ndash; ${holes} Holes</h2>
          <p>Hello ${m.member_name},</p>
          <p>Your scoring code for <strong>${ev.event_name}</strong> is:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace;color:#1a5c38">${pairing.scoring_code}</p>
          <p>This code is shared with your team (<strong>${pairing.team_name}</strong>). Only one player needs to enter the score for the entire team.</p>
          <p><strong>Format:</strong> ${holes} holes (Scramble)<br/>
          ${courseName ? `<strong>Course:</strong> ${courseName}<br/>` : ""}
          ${ev.event_date ? `<strong>Date:</strong> ${ev.event_date}` : ""}</p>
          <p><a href="${link}" style="background:#F5A623;color:#1a5c38;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Enter Your Score</a></p>
          <p style="color:#888;font-size:12px;margin-top:24px">${link}</p>
          <p style="color:#888;font-size:12px">${league.league_name}</p>
        </div>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to: m.email,
          subject: `Your Scoring Code for ${ev.event_name} – ${holes} Holes`,
          html,
        }),
      });
      const ok = resp.ok;
      results.push({ to: m.email, member_id: m.id, code: pairing.scoring_code, ok, error: ok ? null : await resp.text() });
    }

    return json({ sent: results.filter((r) => r.ok).length, results });
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 400);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface Input {
  eventId: string;
  emails: string[];
  message?: string;
}

/** Emails a shareable live-leaderboard link (with event + league details) to selected recipients. */
export const sendLeagueLeaderboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.eventId) throw new Error("eventId is required");
    const emails = (data.emails || [])
      .map((e) => String(e).trim())
      .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (emails.length === 0) throw new Error("At least one valid email is required");
    return { eventId: data.eventId, emails, message: (data.message || "").slice(0, 2000) };
  })
  .handler(async ({ data, context }: any) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ev } = await supabaseAdmin
      .from("league_events")
      .select("id, event_name, event_date, format_type, holes, course_name, league_id, league_course_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!ev) throw new Error("Event not found");

    const { data: league } = await supabaseAdmin
      .from("golf_leagues")
      .select("id, league_name, league_slug, logo_url, organization_id, tagline")
      .eq("id", ev.league_id)
      .maybeSingle();
    if (!league) throw new Error("League not found");

    const { data: membership } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("organization_id", league.organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) throw new Error("Not authorized for this league");

    let courseName: string | null = ev.course_name ?? null;
    if (ev.league_course_id) {
      const { data: c } = await supabaseAdmin
        .from("league_courses")
        .select("course_name")
        .eq("id", ev.league_course_id)
        .maybeSingle();
      if (c?.course_name) courseName = c.course_name;
    }

    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) throw new Error("Email service is not configured");

    const boardLink = `https://teevents.golf/league-leaderboard/${ev.id}`;
    const scoreLink = `https://teevents.golf/league-score`;
    const leagueLink = league.league_slug ? `https://teevents.golf/league/${league.league_slug}` : null;
    const holes = ev.holes === 9 ? 9 : 18;

    const results: { to: string; ok: boolean; error: string | null }[] = [];
    for (const to of data.emails) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
          ${league.logo_url ? `<img src="${league.logo_url}" alt="" style="height:56px;margin-bottom:12px" />` : ""}
          <h2 style="color:#1a5c38;margin-bottom:4px">${ev.event_name} — Live Leaderboard</h2>
          <p style="color:#555;margin-top:0">${league.league_name}${league.tagline ? ` · ${league.tagline}` : ""}</p>
          ${data.message ? `<p>${data.message}</p>` : ""}
          <p><strong>Event:</strong> ${ev.event_name}<br/>
          ${ev.event_date ? `<strong>Date:</strong> ${ev.event_date}<br/>` : ""}
          ${courseName ? `<strong>Course:</strong> ${courseName}<br/>` : ""}
          <strong>Format:</strong> ${holes} holes${ev.format_type ? ` (${ev.format_type})` : ""}</p>
          <p><a href="${scoreLink}" style="background:#F5A623;color:#1a5c38;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Enter Your Scores</a></p>
          <p style="color:#555;font-size:13px;margin-top:-6px">Use your 6-character team scoring code to enter scores.</p>
          <p><a href="${boardLink}" style="background:#1a5c38;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">View Live Leaderboard</a></p>
          ${leagueLink ? `<p><a href="${leagueLink}" style="color:#1a5c38">Visit the ${league.league_name} league page</a></p>` : ""}
          <p style="color:#888;font-size:12px;margin-top:24px">${boardLink}</p>
        </div>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to,
          subject: `${ev.event_name} — Live Leaderboard`,
          html,
        }),
      });
      results.push({ to, ok: resp.ok, error: resp.ok ? null : await resp.text() });
    }

    return { sent: results.filter((r) => r.ok).length, results, link: boardLink };
  });

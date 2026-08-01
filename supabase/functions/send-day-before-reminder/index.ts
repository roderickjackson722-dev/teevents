import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";

const DEFAULTS = {
  subject: "{{event_name}} – Tomorrow is the big day!",
  greeting: "Hello {{first_name}},",
  body_text:
    "This is a reminder that your tournament is tomorrow at {{course_name}}.\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n🔑 Your Scoring Code: {{scoring_code}}\n\n🗓 Event Schedule:\n{{event_schedule}}\n\n🔗 Event Homepage: {{event_homepage}}",
  closing_text:
    "Please arrive 30 minutes before your tee time. Enter your scores with your scoring code at {{scoring_link}}.",
  footer_text: "See you on the course! ⛳",
  button_text: "View Event Homepage",
};

function replaceVars(text: string, vars: Record<string, string>): string {
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, k) => vars[k] ?? "");
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Turn bare URLs into clickable links (input must already be escaped).
function linkify(s: string, color: string) {
  return s.replace(
    /(https?:\/\/[^\s<]+)/g,
    (u) => `<a href="${u}" style="color:${color};font-weight:600;">${u}</a>`,
  );
}

function buildHtml(config: any, vars: Record<string, string>, buttonUrl: string) {
  const c = { ...DEFAULTS, ...(config || {}) };
  const headerBg = c.header_bg_color || "#1a5c38";
  const textColor = c.text_color || "#374151";
  const bgColor = c.secondary_color || "#ffffff";
  const primary = c.primary_color || "#1a5c38";
  const font = c.font_family || "Arial, sans-serif";
  const align = c.logo_alignment || "center";

  const logoHtml = c.show_logo && c.logo_url
    ? `<div style="text-align:${align};margin-bottom:12px;"><img src="${c.logo_url}" alt="Logo" style="max-height:60px;display:inline-block;" /></div>`
    : "";

  const body = linkify(esc(replaceVars(c.body_text, vars)), primary).replace(/\n/g, "<br/>");
  const closing = linkify(esc(replaceVars(c.closing_text, vars)), primary).replace(/\n/g, "<br/>");
  const greeting = esc(replaceVars(c.greeting, vars));
  const footer = esc(replaceVars(c.footer_text, vars));
  const btnText = replaceVars(c.button_text || "View Event Homepage", vars);
  const url = c.button_url || buttonUrl;

  const buttonHtml = url
    ? `<div style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;padding:12px 28px;background:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">${esc(btnText)}</a></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${font};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${bgColor};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${headerBg};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Tomorrow Is the Big Day!</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${body}</p>
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${closing}</p>
          ${buttonHtml}
          <p style="margin:0;color:${textColor};font-size:15px;line-height:1.7;">${footer}</p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${primary};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    ).auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { tournament_id, test_email } = await req.json();
    if (!tournament_id || typeof tournament_id !== "string") throw new Error("Missing tournament_id");

    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, title, date, location, state, course_name, slug, organization_id, day_before_email_config, schedule_info, schedule_info_html")
      .eq("id", tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMember } = await admin.rpc("is_org_member", { _user_id: user.id, _org_id: tournament.organization_id });
    if (!isAdmin && !isMember) throw new Error("Not authorized");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email is not configured");

    // Course address lives on the tournament's saved course record.
    const { data: course } = await admin
      .from("golf_courses")
      .select("course_address")
      .eq("tournament_id", tournament_id)
      .limit(1)
      .maybeSingle();

    const stripTags = (s: string) =>
      s.replace(/<br\s*\/?>(\s*)/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const scheduleRaw =
      (tournament as any).schedule_info ||
      ((tournament as any).schedule_info_html ? stripTags((tournament as any).schedule_info_html) : "");
    const schedule = scheduleRaw ? String(scheduleRaw).trim() : "See the event homepage for the full schedule.";

    const config = { ...DEFAULTS, ...((tournament as any).day_before_email_config || {}) };
    // Older saved templates may predate address / schedule / homepage — append what's missing.
    {
      let bt = String(config.body_text || DEFAULTS.body_text);
      if (!bt.includes("{{course_address}}")) bt += "\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}";
      if (!bt.includes("{{event_schedule}}")) bt += "\n\n🗓 Event Schedule:\n{{event_schedule}}";
      if (!bt.includes("{{event_homepage}}")) bt += "\n\n🔗 Event Homepage: {{event_homepage}}";
      config.body_text = bt;
    }
    const dateStr = tournament.date
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(tournament.date) ? `${tournament.date}T00:00:00` : tournament.date)
          .toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "";
    const homepage = tournament.slug ? `https://www.teevents.golf/t/${tournament.slug}` : "https://www.teevents.golf";
    const scoringLink = tournament.slug ? `${homepage}/scoring` : "https://www.teevents.golf/score";
    const courseAddress = (course as any)?.course_address || tournament.location || "See event homepage";

    const buildVars = (reg: any) => ({
      first_name: reg.first_name || "",
      last_name: reg.last_name || "",
      event_name: tournament.title || "",
      event_date: dateStr,
      event_location: [tournament.location, (tournament as any).state].filter(Boolean).join(", "),
      course_name: (tournament as any).course_name || tournament.location || "",
      course_address: courseAddress,
      event_schedule: schedule,
      tee_time: reg.tee_time || "TBD",
      hole_number: reg.group_number != null ? String(reg.group_number) : "TBD",
      scoring_code: reg.group_scoring_code || reg.scoring_code || "Assigned when pairings are finalized",
      scoring_link: scoringLink,
      event_homepage: homepage,
    });

    const send = async (to: string, vars: Record<string, string>) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: SENDER,
          to: [to],
          subject: replaceVars(config.subject || DEFAULTS.subject, vars),
          html: buildHtml(config, vars, homepage),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    };

    if (test_email) {
      await send(String(test_email), buildVars({ first_name: "Test", last_name: "Player", scoring_code: "ABC123", group_number: 1, tee_time: "8:30 AM" }));
      return new Response(JSON.stringify({ sent: 1, failed: 0, test: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: regs } = await admin
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, scoring_code, group_scoring_code, group_number, tee_time")
      .eq("tournament_id", tournament_id)
      .eq("payment_status", "paid");

    let sent = 0;
    let failed = 0;
    for (const reg of regs || []) {
      if (!reg.email) { failed++; continue; }
      try {
        await send(reg.email, buildVars(reg));
        sent++;
      } catch (e) {
        console.error("[day-before-reminder] send failed", reg.id, e);
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[day-before-reminder]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

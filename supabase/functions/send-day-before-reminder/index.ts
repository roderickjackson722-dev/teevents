import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";

const DEFAULT_SECTION_ORDER = [
  "body",
  "schedule",
  "closing",
  "action_buttons",
  "homepage_button",
  "homepage_link",
  "addons",
  "footer",
];

const DEFAULTS = {
  subject: "{{event_name}} – Your tournament is almost here!",
  header_title: "Your Tournament Is Almost Here!",
  greeting: "Hello {{first_name}},",
  body_text:
    "Here are your final details for {{event_name}} at {{course_name}}.\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n🔑 Your Scoring Code: {{scoring_code}}",
  closing_text:
    "Please arrive 30 minutes before your tee time.\n\nEnter your scores with your scoring code at:\n👉 {{scoring_link}}",

  footer_text: "See you on the course! ⛳",
  button_text: "View Event Homepage",
  show_scoring_button: true,
  scoring_button_text: "Enter My Scores",
  show_leaderboard_button: true,
  leaderboard_button_text: "View Live Leaderboard",
  show_schedule: true,
  schedule_heading: "🗓 Event Schedule",
  show_homepage_link: false,
  homepage_link_label: "🔗 Event Homepage",
  section_order: DEFAULT_SECTION_ORDER,
};


function replaceVars(text: string, vars: Record<string, string>): string {
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, k) => vars[k] ?? "");
}


/** True when organizer content was authored with the rich-text toolbar. */
function isHtmlContent(s?: string): boolean {
  return /<(p|br|div|ul|ol|li|strong|em|u|s|h[1-3]|a|span|img|blockquote)\b/i.test(s || "");
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function removeDuplicateLeaderboardText(text: string): string {
  return (text || "")
    .replace(/<p[^>]*>\s*View the live leaderboard:\s*<\/p>\s*<p[^>]*>\s*👉\s*\{\{leaderboard_link\}\}\s*<\/p>/gi, "")
    .replace(/(?:<p[^>]*>)?\s*View the live leaderboard:\s*(?:<br\s*\/?>(?:\s|&nbsp;)*)?👉\s*\{\{leaderboard_link\}\}\s*(?:<\/p>)?/gi, "")
    .replace(/\n*View the live leaderboard:\s*\n\s*👉\s*\{\{leaderboard_link\}\}/gi, "")
    .trim();
}

function agendaFromPlainText(raw: string): string {
  const text = (raw || "").replace(/\r/g, "").trim();
  if (!text) return "";
  const sections = text.split(/[━─]{3,}/).map((part) => part.trim()).filter(Boolean);
  if (sections.length > 1 || text.includes("•")) {
    return sections.map((section) => {
      const parts = section.split(/\s*•\s*/).map((part) => part.trim()).filter(Boolean);
      const heading = parts.shift() || "";
      const headingTag = /^\d{1,2}:\d{2}\s*(?:am|pm)\b/i.test(heading) ? "h3" : "h2";
      const items = parts.length ? `<ul>${parts.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "";
      return `<section><${headingTag}>${esc(heading)}</${headingTag}>${items}</section>`;
    }).join("");
  }
  return text.split(/\n+/).map((line) => `<p>${esc(line.trim())}</p>`).join("");
}

// Turn bare URLs into clickable links (input must already be escaped).
function linkify(s: string, color: string) {
  return s.replace(
    /(https?:\/\/[^\s<]+)/g,
    (u) => `<a href="${u}" style="color:${color};font-weight:600;">${u}</a>`,
  );
}

function buildHtml(config: any, vars: Record<string, string>, buttonUrl: string, addons: any[] = [], homepage = "") {
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

  const rich = (t: string) => {
    const unwrapped = (t || "").replace(
      /<p(?:\s[^>]*)?>\s*\{\{event_schedule\}\}\s*<\/p>/gi,
      vars.event_schedule || "",
    );
    const filled = replaceVars(unwrapped, vars);
    return isHtmlContent(filled) ? filled : linkify(esc(filled), primary).replace(/\n/g, "<br/>");
  };
  const body = rich(c.body_text);
  const closing = rich(c.closing_text);
  const greeting = esc(replaceVars(c.greeting, vars));
  const footer = esc(replaceVars(c.footer_text, vars));
  const btnText = replaceVars(c.button_text || "View Event Homepage", vars);
  const url = c.button_url || buttonUrl;

  const scoringUrl = vars.scoring_link || "";
  const leaderboardUrl = vars.leaderboard_link || "";
  const actionCells: string[] = [];
  if (c.show_scoring_button !== false && scoringUrl) {
    actionCells.push(
      `<a href="${scoringUrl}" style="display:inline-block;margin:6px;padding:13px 26px;background-color:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">⛳ ${esc(replaceVars(c.scoring_button_text || "Enter My Scores", vars))}</a>`,
    );
  }
  if (c.show_leaderboard_button !== false && leaderboardUrl) {
    actionCells.push(
      `<a href="${leaderboardUrl}" style="display:inline-block;margin:6px;padding:13px 26px;background-color:${primary};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">📊 ${esc(replaceVars(c.leaderboard_button_text || "View Live Leaderboard", vars))}</a>`,
    );
  }
  const actionButtonsHtml = actionCells.length
    ? `<div style="text-align:center;margin:22px 0;padding:18px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">${actionCells.join("")}</div>`
    : "";

  const buttonHtml = url
    ? `<div style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;padding:12px 28px;background:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">${esc(btnText)}</a></div>`
    : "";

  const money = (cents: number) =>
    `$${((cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const addonBase = homepage || buttonUrl || "https://www.teevents.golf";
  const showAddons = c.show_addons !== false && addons.length > 0;
  const addonsInner = `
        <p style="margin:0 0 6px;color:${primary};font-size:17px;font-weight:700;">${esc(c.addons_heading || "⛳ Don't Forget Your Mulligans!")}</p>
        ${c.addons_intro ? `<p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">${esc(c.addons_intro)}</p>` : ""}
        ${addons.map((a: any) => `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;">
            <tr>
              <td style="padding:12px 14px;font-size:14px;color:${textColor};">
                <strong>${esc(a.name || "")}</strong> — ${money(a.price_cents)}
                ${a.description ? `<br/><span style="color:#6b7280;font-size:12px;">${esc(a.description)}</span>` : ""}
              </td>
              <td align="right" style="padding:12px 14px;">
                <a href="${addonBase}/add-ons?addon=${a.id}" style="display:inline-block;padding:9px 16px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;white-space:nowrap;">Purchase Now</a>
              </td>
            </tr>
          </table>`).join("")}`;

  const richBlock = (html: string) =>
    `<div class="tv-rich" style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;overflow-wrap:anywhere;word-break:normal;">${html}</div>`;

  // Every block is independent and rendered in the organizer's chosen order.
  const storedOrder: string[] = Array.isArray(c.section_order)
    ? c.section_order.filter((s: string) => DEFAULT_SECTION_ORDER.includes(s))
    : [];
  const order = storedOrder.length
    ? [...storedOrder, ...DEFAULT_SECTION_ORDER.filter((s) => !storedOrder.includes(s))]
    : [...DEFAULT_SECTION_ORDER];

  const contentHtml = order.map((id) => {
    switch (id) {
      case "body":
        return body.trim() ? richBlock(body) : "";
      case "schedule":
        return c.show_schedule !== false && vars.event_schedule
          ? `${c.schedule_heading ? `<p style="margin:18px 0 8px;color:${textColor};font-size:15px;font-weight:700;">${esc(c.schedule_heading)}</p>` : ""}${richBlock(vars.event_schedule)}`
          : "";
      case "closing":
        return closing.trim() ? richBlock(closing) : "";
      case "action_buttons":
        return actionButtonsHtml;
      case "homepage_button":
        return c.show_button !== false ? buttonHtml : "";
      case "homepage_link":
        return c.show_homepage_link && url
          ? `<p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${esc(c.homepage_link_label || "🔗 Event Homepage")}: <a href="${url}" style="color:${primary};font-weight:600;">${url}</a></p>`
          : "";
      case "addons":
        return showAddons
          ? `<div style="margin:22px 0;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#fffdf5;">${addonsInner}</div>`
          : "";
      case "footer":
        return `<p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${footer}</p>`;
      default:
        return "";
    }
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  .tv-rich h1, .tv-rich h2 { margin:0 0 10px;font-size:17px;line-height:1.35;font-weight:700; }
  .tv-rich h3 { margin:20px 0 8px;font-size:15px;line-height:1.4;font-weight:700; }
  .tv-rich h3:first-child { margin-top:0; }
  .tv-rich p { margin:0;line-height:1.55; }
  .tv-rich p + p { margin-top:14px; }
  .tv-rich ul, .tv-rich ol { margin:6px 0 16px;padding-left:22px; }
  .tv-rich li { margin:0 0 6px;line-height:1.5; }
  .tv-rich section { margin:0 0 18px;padding:0 0 18px;border-bottom:1px solid #e5e7eb; }
  .tv-rich section:last-child { margin-bottom:0;padding-bottom:0;border-bottom:0; }
  @media only screen and (max-width:600px) {
    .tv-wrap { padding:16px 10px !important; }
    .tv-card { width:100% !important; }
    .tv-pad { padding:20px 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${font};">
  <table width="100%" cellpadding="0" cellspacing="0" class="tv-wrap" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" class="tv-card" style="max-width:100%;background:${bgColor};border-radius:8px;overflow:hidden;">
        <tr><td class="tv-pad" style="background:${headerBg};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:${c.header_text_color || "#ffffff"};font-size:22px;font-weight:700;">${esc(replaceVars(c.header_title || DEFAULTS.header_title, vars))}</h1>
        </td></tr>
        <tr><td class="tv-pad" style="padding:32px;">
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          ${contentHtml}
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

    const payload = await req.json().catch(() => ({}));

    // Scheduled (pg_cron) mode: only sends reminders the organizer already
    // approved with a send time in the past. No user session required.
    if (payload?.cron === true) {
      const nowIso = new Date().toISOString();
      const { data: due } = await admin
        .from("tournaments")
        .select("id")
        .eq("day_before_approved", true)
        .is("day_before_sent_at", null)
        .lte("day_before_send_at", nowIso);

      const results: any[] = [];
      for (const t of due || []) {
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-day-before-reminder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            },
            body: JSON.stringify({ tournament_id: t.id, service_run: true }),
          });
          const body = await res.json();
          await admin.from("tournaments").update({ day_before_sent_at: new Date().toISOString() }).eq("id", t.id);
          results.push({ tournament_id: t.id, ...body });
        } catch (e) {
          console.error("[day-before-reminder] cron send failed", t.id, e);
          results.push({ tournament_id: t.id, error: (e as Error).message });
        }
      }
      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tournament_id, test_email, service_run, registration_ids } = payload as any;
    const targetIds: string[] | null = Array.isArray(registration_ids) && registration_ids.length > 0
      ? registration_ids.map((x: unknown) => String(x))
      : null;
    if (!tournament_id || typeof tournament_id !== "string") throw new Error("Missing tournament_id");

    let user: { id: string } | null = null;
    if (!service_run) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: u } } = await createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      ).auth.getUser(token);
      if (!u) throw new Error("Not authenticated");
      user = u;
    }

    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, title, date, location, state, course_name, slug, organization_id, day_before_email_config, schedule_info, schedule_info_html")
      .eq("id", tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    if (user) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      const { data: isMember } = await admin.rpc("is_org_member", { _user_id: user.id, _org_id: tournament.organization_id });
      if (!isAdmin && !isMember) throw new Error("Not authorized");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email is not configured");

    // Course address lives on the tournament's saved course record.
    const { data: course } = await admin
      .from("golf_courses")
      .select("course_address")
      .eq("tournament_id", tournament_id)
      .limit(1)
      .maybeSingle();

    const savedCfg = ((tournament as any).day_before_email_config || {}) as any;
    const scheduleOverride = String(savedCfg.schedule_override || "").trim();
    const publicScheduleHtml = String((tournament as any).schedule_info_html || "").trim();
    const schedule = scheduleOverride || publicScheduleHtml || agendaFromPlainText(String((tournament as any).schedule_info || "")) ||
      "See the event homepage for the full schedule.";

    const { data: addons } = await admin
      .from("tournament_registration_addons")
      .select("id, name, description, price_cents, is_active")
      .eq("tournament_id", tournament_id)
      .eq("is_active", true);

    const config = { ...DEFAULTS, ...((tournament as any).day_before_email_config || {}) };
    // Legacy templates baked the schedule / homepage lines into the body text.
    // They are now standalone, movable sections, so strip them out to avoid duplicates.
    {
      const hadHomepage = /\{\{event_homepage\}\}/i.test(String(config.body_text || ""));
      let bt = String(config.body_text || DEFAULTS.body_text);
      if (!bt.includes("{{course_address}}")) bt += "\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}";
      bt = bt
        .replace(/<p[^>]*>\s*(?:🗓\s*)?Event Schedule:?\s*<\/p>/gi, "")
        .replace(/<p[^>]*>\s*\{\{event_schedule\}\}\s*<\/p>/gi, "")
        .replace(/<p[^>]*>\s*🔗?\s*Event Homepage:?\s*\{\{event_homepage\}\}\s*<\/p>/gi, "")
        .replace(/(?:🗓\s*)?Event Schedule:?\s*\n?/gi, "")
        .replace(/🔗?\s*Event Homepage:?\s*\{\{event_homepage\}\}/gi, "")
        .replace(/\{\{event_schedule\}\}/g, "")
        .replace(/\{\{event_homepage\}\}/g, "")
        .replace(/(?:<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>\s*)+$/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      config.body_text = bt;
      if (config.show_schedule === undefined) config.show_schedule = true;
      if (config.show_homepage_link === undefined) {
        config.show_homepage_link = Array.isArray((tournament as any).day_before_email_config?.section_order)
          ? false
          : hadHomepage;
      }

      // Keep the leaderboard action in its dedicated button, not as duplicate closing copy.
      let ct = String(config.closing_text ?? DEFAULTS.closing_text);
      ct = ct.replace(/\{\{scoring_link\}\}\./g, "{{scoring_link}}");
      config.closing_text = removeDuplicateLeaderboardText(ct);
    }


    const dateStr = tournament.date
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(tournament.date) ? `${tournament.date}T00:00:00` : tournament.date)
          .toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "";
    const homepage = tournament.slug ? `https://www.teevents.golf/t/${tournament.slug}` : "https://www.teevents.golf";
    const scoringLink = tournament.slug ? `${homepage}/scoring` : "https://www.teevents.golf/score";
    const leaderboardLink = tournament.slug
      ? `https://www.teevents.golf/live/${tournament.slug}`
      : "https://www.teevents.golf";
    const courseAddress = (course as any)?.course_address || tournament.location || "See event homepage";

    // Pairing groups own the finalized tee time; fall back to the registration value.
    const { data: pairGroups } = await admin
      .from("registration_groups")
      .select("group_number, tee_time")
      .eq("tournament_id", tournament_id);
    const groupTeeTimes = new Map<number, string>();
    for (const g of (pairGroups || []) as any[]) {
      if (g.group_number != null && g.tee_time) groupTeeTimes.set(g.group_number, String(g.tee_time));
    }

    const buildVars = (reg: any) => ({
      first_name: reg.first_name || "",
      last_name: reg.last_name || "",
      event_name: tournament.title || "",
      event_date: dateStr,
      event_location: [tournament.location, (tournament as any).state].filter(Boolean).join(", "),
      course_name: (tournament as any).course_name || tournament.location || "",
      course_address: courseAddress,
      event_schedule: schedule,
      tee_time: (reg.group_number != null ? groupTeeTimes.get(reg.group_number) : undefined) || reg.tee_time || "TBD",
      hole_number: reg.group_number != null ? String(reg.group_number) : "TBD",
      scoring_code: reg.group_scoring_code || reg.scoring_code || "Assigned when pairings are finalized",
      scoring_link: scoringLink,
      leaderboard_link: leaderboardLink,
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
          html: buildHtml(config, vars, homepage, addons || [], homepage),
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

    let regQuery = admin
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, scoring_code, group_scoring_code, group_number, tee_time")
      .eq("tournament_id", tournament_id);
    // When the organizer hand-picks recipients, send only to those registrations
    // (regardless of payment status). Otherwise default to all paid players.
    if (targetIds) regQuery = regQuery.in("id", targetIds);
    else regQuery = regQuery.eq("payment_status", "paid");
    const { data: regs, error: regErr } = await regQuery;
    if (regErr) throw new Error(`Could not load recipients: ${regErr.message}`);
    if (!regs || regs.length === 0) throw new Error("No recipients found for this tournament");

    // Scoring codes are assigned per group; fill in any row missing its copy so the
    // emailed code matches the code shown in Players & Pairings.
    const groupCodes = new Map<number, string>();
    for (const r of (regs || []) as any[]) {
      const code = r.group_scoring_code || r.scoring_code;
      if (r.group_number != null && code && !groupCodes.has(r.group_number)) groupCodes.set(r.group_number, code);
    }
    for (const r of (regs || []) as any[]) {
      if (!r.group_scoring_code && !r.scoring_code && r.group_number != null) {
        r.group_scoring_code = groupCodes.get(r.group_number) || null;
      }
    }

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

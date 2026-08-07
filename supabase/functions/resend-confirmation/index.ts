import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

function replaceVars(text: string, vars: Record<string, string>): string {
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, k: string) => vars[k] ?? "");
}

const TEMPLATE_HEADERS: Record<string, string> = {
  confirmation: "Registration Confirmed!",
  sponsor: "Thank You for Sponsoring!",
  vendor: "Vendor Registration Confirmed!",
  post_event: "Thanks for Playing!",
  day_before: "Your Tournament Is Almost Here!",
  pairings_update: "Updated Hole Assignments",
};



const BASE_DEFAULT = {
  subject: "You're Registered — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text: "We've received your registration for {{event_name}}. Thank you for signing up!",
  closing_text: "We look forward to seeing you there!",
  footer_text: "See you on the course! ⛳",
  primary_color: "#1a5c38",
  secondary_color: "#ffffff",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  show_event_details: true,
  show_logo: false,
  logo_url: "",
  logo_alignment: "center",
  button_text: "View Event Details",
  button_url: "",
  show_button: false,
  font_family: "Arial, sans-serif",
};

const DEFAULT_CONFIGS: Record<string, any> = {
  confirmation: BASE_DEFAULT,
  sponsor: {
    ...BASE_DEFAULT,
    subject: "Thank you for sponsoring {{event_name}}!",
    body_text: "Thank you for your generous sponsorship of {{event_name}}.",
  },
  vendor: {
    ...BASE_DEFAULT,
    subject: "Vendor Registration Confirmed — {{event_name}}",
    body_text: "Your vendor booth is confirmed for {{event_name}}.",
  },
  post_event: {
    ...BASE_DEFAULT,
    subject: "Thanks for playing in {{event_name}}!",
    body_text: "Thank you for joining us at {{event_name}}! Keep an eye out for final results and photos.",
    closing_text: "Want to be the first to know about our next tournament? Stay in the loop.",
    show_event_details: false,
  },
  day_before: {
    ...BASE_DEFAULT,
    subject: "{{event_name}} – Your tournament is almost here!",
    greeting: "Hello {{first_name}},",
    body_text: "This is a reminder that your tournament is tomorrow at {{course_name}}.\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n🔑 Your Scoring Code: {{scoring_code}}\n\n🗓 Event Schedule:\n{{event_schedule}}\n\n🔗 Event Homepage: {{event_homepage}}",
    closing_text: "Please arrive 30 minutes before your tee time.\n\nEnter your scores with your scoring code at:\n👉 {{scoring_link}}",
    button_text: "View Event Homepage",
    show_event_details: false,
  },
  pairings_update: {
    ...BASE_DEFAULT,
    subject: "{{event_name}} – Updated Hole Assignments",
    greeting: "Hello {{first_name}},",
    header_title: "Updated Hole Assignments",
    body_text: "We've updated the pairings for {{event_name}}. Here are your current assignments:\n\n🏌️ Starting Hole: {{hole_number}}\n👥 Team / Group: {{team_name}}\n⏰ Tee Time: {{tee_time}}\n🔑 Your Scoring Code: {{scoring_code}}",
    closing_text: "Please double-check your starting hole before you arrive — assignments have changed since your original confirmation. Plan to check in 30 minutes before your tee time.",
    footer_text: "See you on the course! ⛳",
    button_text: "View Event Homepage",
    show_event_details: true,
  },
};



/** True when organizer content was authored with the rich-text toolbar. */
function isHtmlContent(s?: string): boolean {
  return /<(p|br|div|ul|ol|li|strong|em|u|s|h[1-3]|a|span|img|blockquote)\b/i.test(s || "");
}

function removeDuplicateLeaderboardText(text: string): string {
  return (text || "")
    .replace(/<p[^>]*>\s*View the live leaderboard:\s*<\/p>\s*<p[^>]*>\s*👉\s*\{\{leaderboard_link\}\}\s*<\/p>/gi, "")
    .replace(/(?:<p[^>]*>)?\s*View the live leaderboard:\s*(?:<br\s*\/?>(?:\s|&nbsp;)*)?👉\s*\{\{leaderboard_link\}\}\s*(?:<\/p>)?/gi, "")
    .replace(/\n*View the live leaderboard:\s*\n\s*👉\s*\{\{leaderboard_link\}\}/gi, "")
    .trim();
}

function buildCustomHtml(config: any, vars: Record<string, string>, opts?: { includePlayerHub?: boolean; hubUrl?: string; headerText?: string }): string {
  const greeting = replaceVars(config.greeting || "Hi {{first_name}},", vars);


  const bodySource = (config.body_text || "").replace(
    /<p(?:\s[^>]*)?>\s*\{\{event_schedule\}\}\s*<\/p>/gi,
    vars.event_schedule || "",
  );
  const body = isHtmlContent(replaceVars(bodySource, vars))
    ? replaceVars(bodySource, vars)
    : replaceVars(config.body_text || "", vars).replace(/\n/g, "<br/>");
  const closing = isHtmlContent(replaceVars(config.closing_text || "", vars))
    ? replaceVars(config.closing_text || "", vars)
    : replaceVars(config.closing_text || "", vars).replace(/\n/g, "<br/>");
  const footer = replaceVars(config.footer_text || "", vars);
  const headerBg = config.header_bg_color || "#1a5c38";
  const textColor = config.text_color || "#374151";
  const bgColor = config.secondary_color || "#ffffff";
  const primaryColor = config.primary_color || "#1a5c38";
  const fontFamily = config.font_family || "Arial, sans-serif";
  const align = config.logo_alignment || "center";

  const eventDetailsHtml = config.show_event_details !== false && (vars.event_date || vars.event_location)
    ? `<div style="margin:16px 0;">
        ${vars.event_date ? `<p style="margin:0 0 6px;color:${textColor};font-size:15px;">📅 <strong>Date:</strong> ${vars.event_date}</p>` : ""}
        ${vars.event_location ? `<p style="margin:0;color:${textColor};font-size:15px;">📍 <strong>Location:</strong> ${vars.event_location}</p>` : ""}
       </div>`
    : "";

  const logoHtml = config.show_logo && config.logo_url
    ? `<div style="text-align:${align};margin-bottom:12px;"><img src="${config.logo_url}" alt="Logo" style="max-height:60px;display:inline-block;" /></div>`
    : "";

  const buttonHtml = config.show_button && config.button_text
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${config.button_url || '#'}" style="display:inline-block;padding:12px 28px;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${config.button_text}</a>
       </div>`
    : "";

  const hubUrl = opts?.hubUrl || "";
  const qrImg = hubUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(hubUrl)}` : "";
  const hubBlock = opts?.includePlayerHub && hubUrl ? `
        <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0 0 6px;color:${primaryColor};font-size:16px;font-weight:700;">📱 Your Personal Player Hub</p>
          <p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">Scan or tap on event day for live scoring, leaderboard, schedule &amp; more — no login needed.</p>
          <a href="${hubUrl}" style="text-decoration:none;"><img src="${qrImg}" width="180" height="180" alt="Player Hub QR Code" style="display:block;margin:0 auto 12px;border:6px solid #ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);"/></a>
          <a href="${hubUrl}" style="display:inline-block;padding:10px 22px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;">Open My Player Hub</a>
          <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Bookmark this link on your phone — it's your personal pass for the entire tournament.</p>
        </td></tr>` : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  .tv-rich h1,.tv-rich h2{margin:0 0 10px;font-size:17px;line-height:1.35;font-weight:700}.tv-rich h3{margin:20px 0 8px;font-size:15px;line-height:1.4;font-weight:700}.tv-rich h3:first-child{margin-top:0}.tv-rich p{margin:0;line-height:1.55}.tv-rich p+p{margin-top:14px}.tv-rich ul,.tv-rich ol{margin:6px 0 16px;padding-left:22px}.tv-rich li{margin:0 0 6px;line-height:1.5}.tv-rich section{margin:0 0 18px;padding:0 0 18px;border-bottom:1px solid #e5e7eb}.tv-rich section:last-child{margin-bottom:0;padding-bottom:0;border-bottom:0}@media only screen and (max-width:600px){.tv-wrap{padding:16px 10px!important}.tv-card{width:100%!important}.tv-pad{padding:20px 18px!important}}
</style></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" class="tv-wrap" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" class="tv-card" style="max-width:100%;background:${bgColor};border-radius:8px;overflow:hidden;">
        <tr><td class="tv-pad" style="background:${headerBg};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:${config.header_text_color || "#ffffff"};font-size:22px;font-weight:700;">${config.header_title || opts?.headerText || "Registration Confirmed!"}</h1>
        </td></tr>
        <tr><td class="tv-pad" style="padding:32px;">
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          <div class="tv-rich" style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;overflow-wrap:anywhere;word-break:normal;">${body}</div>
          ${eventDetailsHtml}
          <div class="tv-rich" style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;overflow-wrap:anywhere;word-break:normal;">${closing}</div>
          ${buttonHtml}
          <p style="margin:0;color:${textColor};font-size:15px;line-height:1.7;">${footer}</p>
        </td></tr>${hubBlock}
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${primaryColor};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    ).auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { registration_ids, use_custom_template, update_email, template_kind } = await req.json();

    // Optional: update a registrant's email before resending
    if (update_email && update_email.registration_id && update_email.new_email) {
      const { error: updateErr } = await supabaseAdmin
        .from("tournament_registrations")
        .update({ email: update_email.new_email.trim() })
        .eq("id", update_email.registration_id);
      if (updateErr) {
        console.error("[Resend Confirmation] Failed to update email:", updateErr);
        throw new Error("Failed to update registrant email");
      }
      console.log(`[Resend Confirmation] Updated email for ${update_email.registration_id} to ${update_email.new_email}`);
    }

    if (!registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
      throw new Error("Missing registration_ids array");
    }

    // Get registrations with tournament info
    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, tournament_id, qr_token, scoring_code, group_scoring_code, group_number, tee_time")
      .in("id", registration_ids);

    if (regErr || !registrations || registrations.length === 0) {
      throw new Error("Registrations not found");
    }

    // Scoring codes live at the GROUP level. Build a map of group_number -> code from
    // every registration in the tournament so the emailed code always matches the code
    // shown next to the player in Players & Pairings.
    const tId = registrations[0].tournament_id;
    const { data: allRegs } = await supabaseAdmin
      .from("tournament_registrations")
      .select("group_number, scoring_code, group_scoring_code")
      .eq("tournament_id", tId);
    const groupCodes = new Map<number, string>();
    for (const r of (allRegs || []) as any[]) {
      const code = r.group_scoring_code || r.scoring_code;
      if (r.group_number != null && code && !groupCodes.has(r.group_number)) {
        groupCodes.set(r.group_number, code);
      }
    }
    // Tee times are finalized in Players & Pairings at the GROUP level; prefer those.
    const { data: pairGroups } = await supabaseAdmin
      .from("registration_groups")
      .select("group_number, tee_time, team_name, group_name")
      .eq("tournament_id", tId);
    const groupTeeTimes = new Map<number, string>();
    const groupNames = new Map<number, string>();
    for (const g of (pairGroups || []) as any[]) {
      if (g.group_number != null && g.tee_time) groupTeeTimes.set(g.group_number, String(g.tee_time));
      const name = g.team_name || g.group_name;
      if (g.group_number != null && name) groupNames.set(g.group_number, String(name));
    }
    const teeTimeFor = (r: any) =>
      (r.group_number != null ? groupTeeTimes.get(r.group_number) : undefined)
      || r.tee_time || "TBD";
    const teamNameFor = (r: any) =>
      (r.group_number != null ? groupNames.get(r.group_number) : undefined)
      || (r.group_number != null ? `Hole ${r.group_number}` : "To be assigned");


    const codeFor = (r: any) =>
      r.group_scoring_code || r.scoring_code
      || (r.group_number != null ? groupCodes.get(r.group_number) : undefined)
      || "";

    // Get tournament info
    const tournamentId = registrations[0].tournament_id;
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("title, date, location, state, course_name, organization_id, confirmation_email_config, post_event_email_config, day_before_email_config, sponsor_email_config, vendor_email_config, schedule_info, schedule_info_html, slug")
      .eq("id", tournamentId)
      .single();

    if (!tournament) throw new Error("Tournament not found");

    // Verify user is org member
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: tournament.organization_id });
    if (!isAdmin && !isMember) throw new Error("Not authorized");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const kind = template_kind || "confirmation";
    const CONFIG_COLUMN: Record<string, string> = {
      confirmation: "confirmation_email_config",
      post_event: "post_event_email_config",
      day_before: "day_before_email_config",
      sponsor: "sponsor_email_config",
      vendor: "vendor_email_config",
    };
    const configColumn = CONFIG_COLUMN[kind] || "confirmation_email_config";
    const stored = (tournament as any)[configColumn] as any;
    // Fall back to the built-in defaults FOR THE SELECTED TEMPLATE — never to the
    // registration confirmation email — so the sent email always matches the choice.
    const emailConfig = { ...(DEFAULT_CONFIGS[kind] || DEFAULT_CONFIGS.confirmation), ...(stored || {}) };
    // Keep the leaderboard action in its dedicated button, not as duplicate closing copy.
    if (typeof emailConfig.closing_text === "string" && emailConfig.closing_text.includes("{{scoring_link}}")) {
      let ct = emailConfig.closing_text.replace(/\{\{scoring_link\}\}\./g, "{{scoring_link}}");
      emailConfig.closing_text = removeDuplicateLeaderboardText(ct);
    }

    const useCustom = use_custom_template !== false;
    const headerText = TEMPLATE_HEADERS[kind] || TEMPLATE_HEADERS.confirmation;

    // Course address / schedule for day-before style reminders
    const { data: course } = await supabaseAdmin
      .from("golf_courses")
      .select("course_address")
      .eq("tournament_id", tournamentId)
      .limit(1)
      .maybeSingle();
    const scheduleRaw = emailConfig.schedule_override
      || (tournament as any).schedule_info_html
      || (tournament as any).schedule_info;
    const schedule = scheduleRaw ? String(scheduleRaw).trim() : "See the event homepage for the full schedule.";
    const locationFull = [(tournament as any).location, (tournament as any).state].filter(Boolean).join(", ");
    const homepage = (tournament as any).slug
      ? `https://www.teevents.golf/t/${(tournament as any).slug}`
      : "https://www.teevents.golf";
    if (!emailConfig.button_url) emailConfig.button_url = homepage;

    const dateStr = tournament.date
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(tournament.date) ? `${tournament.date}T00:00:00` : tournament.date)
          .toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    // Send emails
    const results: any[] = [];
    const logEmail = async (row: { email: string; subject: string; status: "sent" | "failed"; error?: string | null; meta?: Record<string, unknown> }) => {
      try {
        await supabaseAdmin.from("email_send_log").insert({
          message_id: crypto.randomUUID(),
          template_name: `${kind}-email`,
          recipient_email: row.email,
          subject: row.subject,
          status: row.status,
          source: "resend-confirmation",
          error_message: row.error || null,
          metadata: row.meta || {},
          organization_id: (tournament as any).organization_id || null,
          tournament_id: tournamentId,
          triggered_by: user?.id || null,
        });
      } catch (e) {
        console.error("[resend-confirmation] log insert failed", e);
      }
    };
    let sent = 0;
    let failed = 0;
    for (const reg of registrations) {
      const regName = `${reg.first_name || ""} ${reg.last_name || ""}`.trim();
      let regSubject = `You're Registered — ${tournament.title}`;
      let regTeeTime = "";
      try {
        if (useCustom && RESEND_API_KEY) {
          // Use custom template
          const vars: Record<string, string> = {
            first_name: reg.first_name,
            last_name: reg.last_name,
            event_name: tournament.title,
            event_date: dateStr || "",
            event_location: locationFull || tournament.location || "",
            course_name: (tournament as any).course_name || tournament.location || "",
            course_address: (course as any)?.course_address || locationFull || "See event homepage",
            event_schedule: schedule,
            tee_time: teeTimeFor(reg as any),
            hole_number: (reg as any).group_number != null ? String((reg as any).group_number) : "TBD",
            scoring_code: codeFor(reg as any)
              || "Scoring code will be assigned when pairings are finalized",
            group_number: (reg as any).group_number != null ? String((reg as any).group_number) : "",
            scoring_link: (tournament as any).slug ? `${homepage}/scoring` : "https://www.teevents.golf/score",
            leaderboard_link: (tournament as any).slug ? `https://www.teevents.golf/live/${(tournament as any).slug}` : "https://www.teevents.golf",
            event_homepage: homepage,
          };
          const subject = replaceVars(emailConfig.subject || `You're Registered — ${tournament.title}`, vars);
          regSubject = subject;
          regTeeTime = vars.tee_time;
          const slug = (tournament as any).slug;
          const qrToken = (reg as any).qr_token;
          const hubUrl = slug && qrToken ? `https://www.teevents.golf/player/${slug}/${qrToken}` : "";
          const html = buildCustomHtml(emailConfig, vars, { includePlayerHub: kind === "confirmation" && !!hubUrl, hubUrl, headerText });

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
              to: [reg.email],
              subject,
              html,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            console.error(`Resend API error (${res.status}):`, err);
            failed++;
            results.push({ registration_id: reg.id, name: regName, email: reg.email, status: "failed", error: err, tee_time: regTeeTime });
            await logEmail({ email: reg.email, subject, status: "failed", error: err, meta: { registration_id: reg.id, name: regName, tee_time: regTeeTime } });
          } else {
            console.log(`[Custom Confirmation] Sent to ${reg.email}`);
            sent++;
            results.push({ registration_id: reg.id, name: regName, email: reg.email, status: "sent", tee_time: regTeeTime });
            await logEmail({ email: reg.email, subject, status: "sent", meta: { registration_id: reg.id, name: regName, tee_time: regTeeTime } });
          }
        } else {
          // Use default template
          await sendRegistrantConfirmationEmail(
            reg.first_name,
            reg.last_name,
            reg.email,
            tournament.title,
            tournament.date,
            tournament.location,
            (tournament as any).slug,
            tournamentId,
            (reg as any).qr_token || null,
          );
          sent++;
          results.push({ registration_id: reg.id, name: regName, email: reg.email, status: "sent", tee_time: regTeeTime });
          await logEmail({ email: reg.email, subject: regSubject, status: "sent", meta: { registration_id: reg.id, name: regName, tee_time: regTeeTime, default_template: true } });
        }
      } catch (e) {
        console.error(`Failed to send to ${reg.email}:`, e);
        failed++;
        results.push({ registration_id: reg.id, name: regName, email: reg.email, status: "failed", error: (e as Error).message, tee_time: regTeeTime });
        await logEmail({ email: reg.email, subject: regSubject, status: "failed", error: (e as Error).message, meta: { registration_id: reg.id, name: regName, tee_time: regTeeTime } });
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[Resend Confirmation Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

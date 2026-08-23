import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

function replaceVars(text: string, vars: Record<string, string>): string {
  return (text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => vars[key] || "");
}

function formatTeeTime(value: unknown): string {
  const raw = String(value || "").trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!match) return raw;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

function pairingValuesFor(pairingsConfig: unknown, groupNumber: number | null | undefined) {
  if (groupNumber == null) return { teeTime: "TBD", startingHole: "TBD" };
  const config = pairingsConfig && typeof pairingsConfig === "object"
    ? pairingsConfig as Record<string, any>
    : {};
  const key = String(groupNumber);
  const day = config.byDay?.["0"] || {};
  return {
    teeTime: formatTeeTime(config.teeTimesByDay?.["0"]?.[key]) || "TBD",
    startingHole: String(config.labels?.[key] || (
      (day.startFormat || "tee_times") === "tee_times" && day.sameStartHole !== false
        ? day.firstTeeHole || 1
        : groupNumber
    )),
  };
}

function buildHtml(config: any, vars: Record<string, string>, headerText: string, opts?: { includePlayerHub?: boolean; hubUrl?: string }): string {
  const greeting = replaceVars(config.greeting || "Hi {{first_name}},", vars);
  const body = replaceVars(config.body_text || "", vars);
  const closing = replaceVars(config.closing_text || "", vars);
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
       </div>` : "";

  const logoHtml = config.show_logo && config.logo_url
    ? `<div style="text-align:${align};margin-bottom:12px;"><img src="${config.logo_url}" alt="Logo" style="max-height:60px;display:inline-block;" /></div>` : "";

  const buttonHtml = config.show_button && config.button_text
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${config.button_url || '#'}" style="display:inline-block;padding:12px 28px;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${config.button_text}</a>
       </div>` : "";

  const hubUrl = opts?.hubUrl || "https://www.teevents.golf/player/sample/preview";
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(hubUrl)}`;
  const hubBlock = opts?.includePlayerHub ? `
        <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0 0 6px;color:${primaryColor};font-size:16px;font-weight:700;">📱 Your Personal Player Hub</p>
          <p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">Scan or tap on event day for live scoring, leaderboard, schedule &amp; more — no login needed.</p>
          <a href="${hubUrl}" style="text-decoration:none;"><img src="${qrImg}" width="180" height="180" alt="Player Hub QR Code" style="display:block;margin:0 auto 12px;border:6px solid #ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);"/></a>
          <a href="${hubUrl}" style="display:inline-block;padding:10px 22px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;">Open My Player Hub</a>
          <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Bookmark this link on your phone — it's your personal pass for the entire tournament.</p>
        </td></tr>` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${bgColor};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${headerBg};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${headerText}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${body}</p>
          ${eventDetailsHtml}
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${closing}</p>
          ${buttonHtml}
          <p style="margin:0;color:${textColor};font-size:15px;line-height:1.7;">${footer}</p>
        </td></tr>${hubBlock}
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${primaryColor};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    ).auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { recipient_email, config, tournament_id, template_kind } = await req.json();
    if (!recipient_email || !config) throw new Error("Missing recipient_email or config");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let tournamentTitle = "Sample Tournament";
    let tournamentDate: string | null = null;
    let tournamentLocation: string | null = null;

    let tournamentSlug: string | null = null;
    let pairingsConfig: unknown = {};
    if (tournament_id) {
      const { data: t } = await supabaseAdmin
        .from("tournaments")
        .select("title, date, location, organization_id, slug, pairings_config")
        .eq("id", tournament_id)
        .maybeSingle();
      if (t) {
        tournamentTitle = (t as any).title || tournamentTitle;
        tournamentDate = (t as any).date || null;
        tournamentLocation = (t as any).location || null;
        tournamentSlug = (t as any).slug || null;
        pairingsConfig = (t as any).pairings_config || {};
        // Authorize: must be admin or org member
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
        const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: (t as any).organization_id });
        if (!isAdmin && !isMember) throw new Error("Not authorized");
      }
    }

    const dateStr = tournamentDate
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(tournamentDate) ? `${tournamentDate}T00:00:00` : tournamentDate)
          .toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "Saturday, June 15, 2026";

    let sampleRegistration: any = null;
    if (tournament_id) {
      const { data: registration } = await supabaseAdmin
        .from("tournament_registrations")
        .select("first_name, last_name, group_number, tee_time, scoring_code, group_scoring_code, qr_token")
        .eq("tournament_id", tournament_id)
        .not("group_number", "is", null)
        .order("group_number")
        .limit(1)
        .maybeSingle();
      sampleRegistration = registration;
    }
    const pairing = pairingValuesFor(pairingsConfig, sampleRegistration?.group_number);
    const vars = {
      first_name: sampleRegistration?.first_name || "Test",
      last_name: sampleRegistration?.last_name || "Recipient",
      event_name: tournamentTitle,
      event_date: dateStr,
      event_location: tournamentLocation || "Pine Valley Golf Club",
      tee_time: pairing.teeTime !== "TBD" ? pairing.teeTime : formatTeeTime(sampleRegistration?.tee_time) || "TBD",
      hole_number: pairing.startingHole,
      group_number: sampleRegistration?.group_number != null ? String(sampleRegistration.group_number) : "TBD",
      team_name: sampleRegistration?.group_number != null ? `Group ${sampleRegistration.group_number}` : "To be assigned",
      scoring_code: sampleRegistration?.group_scoring_code || sampleRegistration?.scoring_code || "Assigned when pairings are finalized",
      pairings_link: tournamentSlug
        ? `https://www.teevents.golf/pairings/${tournamentSlug}${sampleRegistration?.group_scoring_code || sampleRegistration?.scoring_code ? `?code=${encodeURIComponent(sampleRegistration.group_scoring_code || sampleRegistration.scoring_code)}` : ""}`
        : "https://www.teevents.golf",
    };

    const headers: Record<string, string> = {
      confirmation: "Registration Confirmed!",
      sponsor: "Thank You for Sponsoring!",
      vendor: "Vendor Registration Confirmed!",
      post_event: "Thanks for Playing!",
    };
    const headerText = headers[template_kind] || "Registration Confirmed!";

    // Use a real registrant's qr_token so the Player Hub link actually works in test emails.
    const sampleToken: string | null = sampleRegistration?.qr_token || null;
    const hubUrl = tournamentSlug && sampleToken
      ? `https://www.teevents.golf/player/${tournamentSlug}/${sampleToken}`
      : tournamentSlug
        ? `https://www.teevents.golf/t/${tournamentSlug}`
        : "https://www.teevents.golf";

    const subject = `[TEST] ${replaceVars(config.subject || "You're Registered — {{event_name}}", vars)}`;
    const html = buildHtml(config, vars, headerText, {
      includePlayerHub: template_kind === "confirmation",
      hubUrl,
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email service not configured");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [recipient_email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[send-confirmation-test]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

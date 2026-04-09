import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents";

function replaceVars(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{\{first_name\}\}/g, vars.first_name || "")
    .replace(/\{\{last_name\}\}/g, vars.last_name || "")
    .replace(/\{\{event_name\}\}/g, vars.event_name || "")
    .replace(/\{\{event_date\}\}/g, vars.event_date || "")
    .replace(/\{\{event_location\}\}/g, vars.event_location || "");
}

function buildCustomHtml(config: any, vars: Record<string, string>): string {
  const greeting = replaceVars(config.greeting || "Hi {{first_name}},", vars);
  const body = replaceVars(config.body_text || "", vars);
  const closing = replaceVars(config.closing_text || "", vars);
  const footer = replaceVars(config.footer_text || "", vars);
  const headerBg = config.header_bg_color || "#1a5c38";
  const textColor = config.text_color || "#374151";
  const bgColor = config.secondary_color || "#ffffff";
  const primaryColor = config.primary_color || "#1a5c38";
  const fontFamily = config.font_family || "Arial, sans-serif";

  const eventDetailsHtml = config.show_event_details !== false && (vars.event_date || vars.event_location)
    ? `<div style="margin:16px 0;">
        ${vars.event_date ? `<p style="margin:0 0 6px;color:${textColor};font-size:15px;">📅 <strong>Date:</strong> ${vars.event_date}</p>` : ""}
        ${vars.event_location ? `<p style="margin:0;color:${textColor};font-size:15px;">📍 <strong>Location:</strong> ${vars.event_location}</p>` : ""}
       </div>`
    : "";

  const logoHtml = config.show_logo && config.logo_url
    ? `<img src="${config.logo_url}" alt="Logo" style="max-height:50px;margin-bottom:12px;" />`
    : "";

  const buttonHtml = config.show_button && config.button_text
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${config.button_url || '#'}" style="display:inline-block;padding:12px 28px;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${config.button_text}</a>
       </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${bgColor};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${headerBg};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <p style="margin:0 0 8px;font-size:32px;">⛳</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Registration Confirmed!</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${body}</p>
          ${eventDetailsHtml}
          <p style="margin:0 0 14px;color:${textColor};font-size:15px;line-height:1.7;">${closing}</p>
          ${buttonHtml}
          <p style="margin:0;color:${textColor};font-size:15px;line-height:1.7;">${footer}</p>
        </td></tr>
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

    const { registration_ids, use_custom_template, update_email } = await req.json();

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
      .select("id, first_name, last_name, email, tournament_id")
      .in("id", registration_ids);

    if (regErr || !registrations || registrations.length === 0) {
      throw new Error("Registrations not found");
    }

    // Get tournament info
    const tournamentId = registrations[0].tournament_id;
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("title, date, location, organization_id, confirmation_email_config, slug")
      .eq("id", tournamentId)
      .single();

    if (!tournament) throw new Error("Tournament not found");

    // Verify user is org member
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: tournament.organization_id });
    if (!isAdmin && !isMember) throw new Error("Not authorized");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const emailConfig = tournament.confirmation_email_config as any;
    const useCustom = use_custom_template && emailConfig;

    const dateStr = tournament.date
      ? new Date(tournament.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    // Send emails
    let sent = 0;
    let failed = 0;
    for (const reg of registrations) {
      try {
        if (useCustom && RESEND_API_KEY) {
          // Use custom template
          const vars = {
            first_name: reg.first_name,
            last_name: reg.last_name,
            event_name: tournament.title,
            event_date: dateStr || "",
            event_location: tournament.location || "",
          };
          const subject = replaceVars(emailConfig.subject || `You're Registered — ${tournament.title}`, vars);
          const html = buildCustomHtml(emailConfig, vars);

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
          } else {
            console.log(`[Custom Confirmation] Sent to ${reg.email}`);
            sent++;
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
          );
          sent++;
        }
      } catch (e) {
        console.error(`Failed to send to ${reg.email}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
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

// Shared (client-safe) template config + HTML builder for the Age Verification Request email.

export interface AgeRequestConfig {
  subject: string;
  header_title: string;
  greeting: string;
  body_text: string;
  closing_text: string;
  footer_text: string;
  button_text: string;
  primary_color: string;
  header_bg_color: string;
  header_text_color: string;
  text_color: string;
  font_family: string;
  show_logo: boolean;
  logo_url: string;
  logo_max_height: number;
}

export const AGE_REQUEST_DEFAULTS: AgeRequestConfig = {
  subject: "Action Required: Complete Your Registration for {{event_name}}",
  header_title: "Complete Your Registration",
  greeting: "Dear {{first_name}},",
  body_text:
    "We hope this message finds you well.<br/><br/>During a recent system update, we noticed that age information for some registrations was not properly saved to our records. This was a technical issue on our end, and we apologize for any inconvenience.<br/><br/>To ensure your registration is complete, please provide your age using one of the options below:<br/><br/><strong>Option 1 &ndash; Secure Form (Recommended):</strong><br/>Use the button below. This will take less than one minute. No other information needs to be changed.<br/><br/><strong>Option 2 &ndash; Reply to this Email:</strong><br/>If you are unable to access the link, simply reply to this email with your age (e.g., &quot;Age: 45&quot;). Your reply will be sent directly to the tournament organizer and our support team.",

  closing_text:
    "If you have already entered this information, we appreciate your patience — this is only being requested to complete our records.",
  footer_text: "Thank you for your understanding and cooperation.",
  button_text: "Update My Age",
  primary_color: "#1a5c38",
  header_bg_color: "#1a5c38",
  header_text_color: "#ffffff",
  text_color: "#374151",
  font_family: "Arial, sans-serif",
  show_logo: false,
  logo_url: "",
  logo_max_height: 60,
};

export const AGE_REQUEST_VARIABLES = [
  "first_name",
  "last_name",
  "player_name",
  "event_name",
  "link_to_age_update_form",
  "tournament_organizer_name",
  "organization_name",
  "contact_phone",
  "contact_email",
];

const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function replaceAgeVars(text: string, vars: Record<string, string>): string {
  let out = text || "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v || "");
    out = out.replace(new RegExp(`\\[${k}\\]`, "gi"), v || "");
  }
  return out;
}

export function buildAgeRequestHtml(
  configIn: Partial<AgeRequestConfig>,
  vars: Record<string, string>,
  link: string,
): string {
  const c = { ...AGE_REQUEST_DEFAULTS, ...(configIn || {}) };
  const logo = c.show_logo && c.logo_url
    ? `<div style="text-align:center;margin-bottom:12px;"><img src="${c.logo_url}" alt="Logo" style="max-height:${c.logo_max_height || 60}px;display:inline-block;" /></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${c.font_family};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:${c.header_bg_color};padding:28px 32px;text-align:center;">
          ${logo}
          <h1 style="margin:0;color:${c.header_text_color};font-size:22px;font-weight:700;">${esc(replaceAgeVars(c.header_title, vars))}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:${c.text_color};font-size:15px;line-height:1.7;"><strong>${replaceAgeVars(c.greeting, vars)}</strong></p>
          <div style="margin:0 0 18px;color:${c.text_color};font-size:15px;line-height:1.7;">${replaceAgeVars(c.body_text, vars)}</div>
          <div style="text-align:center;margin:26px 0;">
            <a href="${link}" style="display:inline-block;padding:14px 30px;background:#F5A623;color:#1a5c38;font-size:16px;font-weight:700;text-decoration:none;border-radius:6px;">${esc(c.button_text)}</a>
          </div>
          <div style="margin:0 0 14px;color:${c.text_color};font-size:15px;line-height:1.7;">${replaceAgeVars(c.closing_text, vars)}</div>
          <div style="margin:0;color:${c.text_color};font-size:15px;line-height:1.7;">${replaceAgeVars(c.footer_text, vars)}</div>
          <p style="margin:18px 0 0;color:${c.text_color};font-size:14px;line-height:1.6;">
            Best regards,<br/>
            ${esc(vars["tournament_organizer_name"] || vars["contact_name"] || "")}${(vars["tournament_organizer_name"] || vars["contact_name"]) ? "<br/>" : ""}
            ${esc(vars["organization_name"] || "")}${vars["organization_name"] ? "<br/>" : ""}
            ${esc(vars["contact_phone"] || "")}${vars["contact_phone"] ? "<br/>" : ""}
            ${esc(vars["contact_email"] || "")}
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${c.primary_color};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

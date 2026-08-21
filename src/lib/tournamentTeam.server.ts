/** Server-only helpers for the per-tournament team management system. */

export const TOURNAMENT_TEAM_ROLES = [
  "organizer",
  "admin",
  "editor",
  "viewer",
  "scoring_only",
] as const;

export function labelRole(role: string) {
  return String(role)
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function siteBaseUrl() {
  return process.env["SITE_URL"] || "https://www.teevents.golf";
}

export function generateInviteToken() {
  return (
    globalThis.crypto.randomUUID().replace(/-/g, "") +
    globalThis.crypto.randomUUID().replace(/-/g, "")
  );
}

export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%&*";
  const all = upper + lower + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pw = pick(upper) + pick(lower) + pick(nums) + pick(syms);
  for (let i = 0; i < 8; i++) pw += pick(all);
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

function teamEmailHtml(opts: {
  heading: string;
  body: string;
  buttonUrl: string;
  buttonText: string;
  greeting: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#1a5c38;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${opts.heading}</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">${opts.greeting}<br><br>${opts.body}</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${opts.buttonUrl}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">${opts.buttonText}</a>
        </div>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">If you didn't expect this, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <a href="https://www.teevents.golf" style="color:#1a5c38;text-decoration:none;font-weight:bold;">TeeVents</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Sends a team invitation / access-granted email. Never throws. */
export async function sendTeamEmail(opts: {
  recipientEmail: string;
  recipientName?: string | null;
  heading: string;
  body: string;
  buttonUrl: string;
  buttonText: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resendKey = process.env["RESEND_API_KEY"];
  if (!resendKey) return { sent: false, error: "Email service is not configured" };

  const html = teamEmailHtml({
    ...opts,
    greeting: opts.recipientName ? `Hi ${opts.recipientName},` : "Hi,",
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: [opts.recipientEmail],
        subject: opts.heading,
        html,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { sent: false, error: (data as any)?.message || `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || "Failed to send email" };
  }
}

/** Looks up an auth user id by email using the admin client. */
export async function findAuthUserByEmail(admin: any, email: string) {
  const target = email.toLowerCase().trim();
  let page = 1;
  for (;;) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users || [];
    const hit = users.find((u: any) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 200) return null;
    page += 1;
    if (page > 25) return null;
  }
}

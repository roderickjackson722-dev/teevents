// Shared helpers for the tiered signup vetting system.
import { sendAndLog } from "./emailLogger.ts";

export const FROM = "TeeVents Golf Management <info@notifications.teevents.golf>";
export const ADMIN_EMAIL = "info@teevents.golf";

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "temp-mail.org", "tempmail.com", "temp-mail.io", "10minutemail.com", "10minutemail.net",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la", "yopmail.com",
  "yopmail.net", "trashmail.com", "trashmail.net", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com",
  "tempail.com", "tempr.email", "discard.email", "mailnesia.com", "mytemp.email", "spamgourmet.com",
  "burnermail.io", "33mail.com", "moakt.com", "tmail.ws", "tmpmail.org", "tmpmail.net", "emailfake.com",
  "fakemail.net", "mailcatch.com", "spam4.me", "inboxkitten.com", "harakirimail.com", "mailpoof.com",
  "linshiyouxiang.net", "byom.de", "trbvm.com", "kasmail.com", "mail.tm", "mailsac.com", "anonaddy.me",
  "tempinbox.com", "mvrht.net", "cuvox.de", "armyspy.com", "dayrep.com", "einrot.com", "fleckens.hu",
  "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com", "teleworm.us", "email-temp.com", "minuteinbox.com",
]);

export function isDisposable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  const parts = domain.split(".");
  // subdomains of disposable providers
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

export function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function shell(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;background:#ffffff;">
    <h1 style="color:#1a5c38;margin:0 0 16px 0;font-size:24px;">${title}</h1>
    ${body}
    <p style="font-size:16px;margin-top:24px;">Best,<br/>The TeeVents Team<br/><span style="color:#6b7280;">TeeVents Golf Management</span></p>
  </div>`;
}

export function button(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;"><a href="${href}" style="background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block;">${label}</a></div>
  <p style="font-size:12px;color:#6b7280;word-break:break-all;">If the button doesn't work, paste this link into your browser: ${href}</p>`;
}

export async function sendVettingEmail(
  admin: any,
  to: string,
  subject: string,
  html: string,
  templateName: string,
  metadata: Record<string, unknown> = {},
) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "Email not configured" };
  return await sendAndLog(admin, key, { from: FROM, to: [to], subject, html, reply_to: ADMIN_EMAIL }, {
    templateName, source: "signup-vetting", metadata,
  });
}

export function firstName(name: string) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

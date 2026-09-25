// Server-only helpers for the signup vetting emails.
export const VETTING_FROM = "TeeVents Golf Management <info@notifications.teevents.golf>";
export const VETTING_ADMIN_EMAIL = "info@teevents.golf";

export function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function firstName(name: string | null | undefined) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}
export function shell(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;background:#ffffff;">
    <h1 style="color:#1a5c38;margin:0 0 16px 0;font-size:24px;">${title}</h1>${body}
    <p style="font-size:16px;margin-top:24px;">Best,<br/>The TeeVents Team<br/><span style="color:#6b7280;">TeeVents Golf Management</span></p></div>`;
}
export function button(href: string, label: string) {
  return `<div style="text-align:center;margin:28px 0;"><a href="${href}" style="background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block;">${label}</a></div>
  <p style="font-size:12px;color:#6b7280;word-break:break-all;">If the button doesn't work, paste this link into your browser: ${href}</p>`;
}

export async function sendVettingEmail(admin: any, to: string, subject: string, html: string, templateName: string, metadata: Record<string, unknown> = {}) {
  const key = process.env["RESEND_API_KEY"];
  const messageId = crypto.randomUUID();
  if (!key) return { ok: false };
  let ok = false; let err: string | null = null; let rid: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: VETTING_FROM, to: [to], subject, html, reply_to: VETTING_ADMIN_EMAIL }),
    });
    const d: any = await res.json().catch(() => ({}));
    ok = res.ok; rid = d?.id ?? null; if (!ok) err = d?.message || `HTTP ${res.status}`;
  } catch (e: any) { err = e?.message || String(e); }
  try {
    await admin.from("email_send_log").insert({
      message_id: messageId, template_name: templateName, recipient_email: to, subject,
      status: ok ? "sent" : "failed", source: "signup-vetting", resend_id: rid, error_message: err, metadata,
    });
  } catch { /* best effort */ }
  return { ok };
}

// Sends a TeeVents monthly newsletter. Admin-only (bearer token is verified in
// the handler). Modes:
//   test -> only the provided test_email (or the caller's own email)
//   send -> every active newsletter subscriber
// Every email carries a one-click unsubscribe link built from the subscriber token.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SENDER = "TeeVents Golf <info@notifications.teevents.golf>";
const REPLY_TO = "info@teevents.golf";
const SITE = "https://www.teevents.golf";

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function personalize(body: string, sub: { full_name?: string | null; email: string }) {
  const first = String(sub.full_name || "").trim().split(/\s+/)[0] || "there";
  return String(body || "")
    .replace(/\[Name\]/g, first)
    .replace(/\[First Name\]/g, first)
    .replace(/\{\{\s*name\s*\}\}/g, first)
    .replace(/\[Email\]/g, sub.email)
    .replace(/\[Tournament Name\]/g, "your tournament")
    .replace(/\{\{\s*tournament_name\s*\}\}/g, "your tournament");
}

const looksHtml = (s: string) => /<\/?(p|div|br|h[1-6]|ul|ol|li|strong|em|a|table|span)\b/i.test(s);

export function buildNewsletterHtml(body: string, unsubUrl: string) {
  const inner = looksHtml(body)
    ? body
    : String(body || "")
        .split(/\n{2,}/)
        .filter((b) => b.trim())
        .map(
          (block) =>
            `<p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">${block
              .split("\n")
              .map((l) => esc(l))
              .join("<br />")}</p>`,
        )
        .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#1a5c38;padding:22px 32px;text-align:center;">
    <a href="${SITE}" style="color:#F5A623;text-decoration:none;font-size:19px;font-weight:700;">TeeVents Golf</a>
  </td></tr>
  <tr><td style="padding:26px 32px;">${inner}</td></tr>
  <tr><td style="background:#f9fafb;padding:18px 32px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
      TeeVents Golf · <a href="${SITE}" style="color:#9ca3af;">teevents.golf</a><br />
      You're receiving this because you subscribed to TeeVents updates.<br />
      <a href="${esc(unsubUrl)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function sendAndLog(
  admin: any,
  apiKey: string,
  payload: { to: string[]; subject: string; html: string },
  meta: { source: string; triggeredBy?: string | null; metadata?: Record<string, unknown> },
) {
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;
  let resendId: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: SENDER, reply_to: REPLY_TO, ...payload }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      status = "failed";
      errorMessage = data?.message || data?.error || `Resend HTTP ${res.status}`;
    } else {
      resendId = data?.id ?? null;
    }
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : String(e);
  }
  for (const to of payload.to) {
    try {
      await admin.from("email_send_log").insert({
        message_id: crypto.randomUUID(),
        template_name: "newsletter",
        recipient_email: to,
        subject: payload.subject,
        status,
        source: meta.source,
        resend_id: resendId,
        error_message: errorMessage,
        triggered_by: meta.triggeredBy ?? null,
        metadata: meta.metadata ?? {},
      } as any);
    } catch {
      /* logging is best-effort */
    }
  }
  return { ok: status === "sent", error: errorMessage };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, authorization",
    },
  });
}

async function handle(request: Request) {
  const apiKey = process.env["RESEND_API_KEY"];
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"];
  if (!url || !serviceKey || !apiKey || !anonKey) return json({ error: "Server not configured" }, 500);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const asUser = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Forbidden" }, 403);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const newsletterId = body.newsletter_id ? String(body.newsletter_id) : "";
  const mode = body.mode === "send" ? "send" : "test";
  if (!newsletterId) return json({ error: "newsletter_id required" }, 400);

  const { data: nl } = await admin.from("newsletters").select("*").eq("id", newsletterId).maybeSingle();
  if (!nl) return json({ error: "Newsletter not found" }, 404);

  type Sub = { email: string; full_name?: string | null; unsubscribe_token?: string | null };
  let recipients: Sub[] = [];

  if (mode === "test") {
    const to = String(body.test_email || user.email || "").trim();
    if (!to) return json({ error: "test_email required" }, 400);
    recipients = [{ email: to, full_name: null, unsubscribe_token: "preview" }];
  } else {
    const { data: subs } = await admin
      .from("newsletter_subscribers")
      .select("email, full_name, unsubscribe_token")
      .eq("status", "active");
    recipients = (subs || []) as Sub[];
    if (!recipients.length) return json({ error: "No active subscribers" }, 400);
  }

  let sent = 0;
  const errors: string[] = [];
  for (const sub of recipients) {
    const unsubUrl = `${SITE}/unsubscribe?t=${encodeURIComponent(sub.unsubscribe_token || "")}&e=${encodeURIComponent(sub.email)}`;
    const html = buildNewsletterHtml(personalize(nl.body || "", sub), unsubUrl);
    const res = await sendAndLog(
      admin,
      apiKey,
      {
        to: [sub.email],
        subject: mode === "test" ? `[TEST] ${nl.subject}` : nl.subject,
        html,
      },
      {
        source: mode === "test" ? "newsletter-test" : "newsletter",
        triggeredBy: user.id,
        metadata: { newsletter_id: newsletterId, mode },
      },
    );
    if (res.ok) sent++;
    else errors.push(`${sub.email}: ${res.error}`);
  }

  if (mode === "send" && sent > 0) {
    await admin
      .from("newsletters")
      .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: sent } as any)
      .eq("id", newsletterId);
  }

  return json({ ok: true, sent, failed: errors.length, errors: errors.slice(0, 10) });
}

export const Route = createFileRoute("/api/public/newsletter-send")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type, authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        }),
      POST: ({ request }) => handle(request),
    },
  },
});

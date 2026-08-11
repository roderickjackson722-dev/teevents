// Post-tournament organizer retention email ("Thank You" / plan your next event).
//
// Runs from a daily pg_cron job (09:00 UTC) and finds tournaments whose end date
// was N days ago (default 7) that have not yet been emailed. Also supports a
// manual/test trigger from the admin dashboard.
//
// Admin control lives in platform_settings key `post_event_organizer_email`.
// Per-tournament opt-out: tournaments.post_event_email_opt_out
//
// POST body:
//   {}                                        -> cron sweep
//   { tournament_id, force?, test_email? }     -> manual / test send
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SENDER = "TeeVents Golf <info@notifications.teevents.golf>";
const ADMIN_EMAIL = "info@teevents.golf";
const SITE = "https://www.teevents.golf";

export type PostEventEmailConfig = {
  enabled: boolean;
  delay_days: number;
  subject: string;
  intro: string;
  closing: string;
  signature: string;
  extra_recipients: string[];
  bcc: string[];
};

export const DEFAULT_POST_EVENT_EMAIL: PostEventEmailConfig = {
  enabled: true,
  delay_days: 7,
  subject: "Thank You – {{tournament_name}} | TeeVents Golf",
  intro:
    "Thank you for trusting TeeVents to power your tournament, {{tournament_name}}!\n\nWe hope your event was a success and that our platform helped you save time, simplify registration, and create a professional experience for your players and sponsors.",
  closing:
    "Thank you again for choosing TeeVents. We look forward to helping you run many more successful events!",
  signature: "Rod Jackson\nTeeVents Golf\ninfo@teevents.golf",
  extra_recipients: [],
  bcc: [ADMIN_EMAIL],
};

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fill(text: string, vars: Record<string, string>) {
  return String(text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
}

function paragraphs(text: string) {
  return String(text || "")
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
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="background:#F5A623;color:#1a5c38;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;margin:4px 8px 4px 0;font-size:14px;">${esc(label)}</a>`;
}

const HR = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0;" />`;

export function buildPostEventOrganizerEmail(opts: {
  config: PostEventEmailConfig;
  organizerName: string;
  tournamentName: string;
  slug?: string | null;
}) {
  const vars = { organizer_name: opts.organizerName, tournament_name: opts.tournamentName };
  const subject = fill(opts.config.subject || DEFAULT_POST_EVENT_EMAIL.subject, vars);
  const base = opts.slug ? `${SITE}/t/${opts.slug}` : SITE;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#1a5c38;padding:26px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:700;">Thank You for a Great Event</h1>
  </td></tr>
  <tr><td style="padding:26px 32px;">
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Dear ${esc(opts.organizerName) || "Organizer"},</p>
    ${paragraphs(fill(opts.config.intro || DEFAULT_POST_EVENT_EMAIL.intro, vars))}
    ${HR}
    <h3 style="margin:0 0 10px;color:#1a5c38;font-size:17px;">📸 Relive the Highlights</h3>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">We've captured some of the best moments from your tournament. Share them with your players and sponsors to keep the excitement going!</p>
    <div>${button(`${base}/gallery`, "Photo Gallery")}${button(`${base}/media`, "Media Clips")}</div>
    ${HR}
    <h3 style="margin:0 0 10px;color:#1a5c38;font-size:17px;">⛳ Start Planning Your Next Event</h3>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">Don't wait until next year to start planning. Early preparation leads to bigger and better tournaments. Here are a few ways we can help you get a head start:</p>
    <ul style="margin:0 0 14px;padding-left:20px;color:#374151;font-size:15px;line-height:1.7;">
      <li><strong>Early Registration:</strong> Set up early bird pricing to boost sign-ups before the season even starts.</li>
      <li><strong>Sponsor Outreach:</strong> Use our sponsor management tools to start recruiting sponsors early.</li>
      <li><strong>Custom Website:</strong> Your tournament page is ready to go – just update the date and start promoting.</li>
    </ul>
    <p style="margin:0 0 10px;color:#374151;font-size:15px;"><strong>🚀 Ready to create your next tournament?</strong></p>
    <div>${button(`${SITE}/dashboard/tournaments`, "Create New Tournament")}</div>
    ${HR}
    <h3 style="margin:0 0 10px;color:#1a5c38;font-size:17px;">📧 Stay Connected with Your Players</h3>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">Send a quick email to your participants with a link to next year's early registration. We've seen organizers get 20-30% of their field signed up within days of sending a post-event email.</p>
    <div>${button(`${SITE}/dashboard/messages`, "Email My Players")}</div>
    ${HR}
    <h3 style="margin:0 0 10px;color:#1a5c38;font-size:17px;">🎯 Looking for a different challenge?</h3>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">Did you know TeeVents also supports Golf Leagues? Run a season-long competition with weekly events, standings, and payouts – all on the same platform you already know.</p>
    <div>${button(`${SITE}/golf-leagues`, "Learn About Golf Leagues")}</div>
    ${HR}
    <h3 style="margin:0 0 10px;color:#1a5c38;font-size:17px;">💬 We'd Love Your Feedback</h3>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">We're always looking to improve. What would you like to see differently on the platform? More features? Better mobile experience? Easier setup? Just reply to this email – we read every response.</p>
    ${HR}
    ${paragraphs(fill(opts.config.closing || DEFAULT_POST_EVENT_EMAIL.closing, vars))}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Best regards,<br />${esc(
      opts.config.signature || DEFAULT_POST_EVENT_EMAIL.signature,
    ).replace(/\n/g, "<br />")}</p>
  </td></tr>
  <tr><td style="background:#1a5c38;padding:16px;text-align:center;">
    <a href="${SITE}" style="color:#F5A623;text-decoration:none;font-size:12px;">teevents.golf</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, html };
}

async function sendAndLog(
  admin: any,
  apiKey: string,
  payload: { to: string[]; bcc?: string[]; subject: string; html: string; reply_to?: string },
  meta: { templateName: string; source: string; organizationId?: string | null; tournamentId?: string | null },
) {
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;
  let resendId: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: SENDER, ...payload }),
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
        template_name: meta.templateName,
        recipient_email: to,
        subject: payload.subject,
        status,
        source: meta.source,
        resend_id: resendId,
        error_message: errorMessage,
        organization_id: meta.organizationId ?? null,
        tournament_id: meta.tournamentId ?? null,
      } as any);
    } catch {
      /* logging is best-effort */
    }
  }
  return { ok: status === "sent", error: errorMessage };
}

async function loadConfig(admin: any): Promise<PostEventEmailConfig> {
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "post_event_organizer_email")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<PostEventEmailConfig>;
  return {
    ...DEFAULT_POST_EVENT_EMAIL,
    ...(v && typeof v === "object" ? v : {}),
    extra_recipients: Array.isArray(v?.extra_recipients) ? v.extra_recipients : [],
    bcc: Array.isArray(v?.bcc) ? v.bcc : DEFAULT_POST_EVENT_EMAIL.bcc,
  };
}

async function organizerEmail(admin: any, t: any): Promise<string | null> {
  if (t.contact_email) return String(t.contact_email).trim();
  try {
    const { data: owner } = await admin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", t.organization_id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();
    if (owner?.user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(owner.user_id);
      return authUser?.user?.email ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const SELECT =
  "id, title, slug, date, end_date, organization_id, contact_email, post_event_email_sent, post_event_email_opt_out";

async function handle(request: Request) {
  const apiKey = process.env["RESEND_API_KEY"];
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey || !apiKey) return json({ error: "Server not configured" }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const config = await loadConfig(admin);
  const manual = !!body.tournament_id;
  const testEmail = body.test_email ? String(body.test_email).trim() : null;

  if (!config.enabled && !manual) return json({ ok: true, skipped: "disabled" });

  let candidates: any[] = [];
  if (manual) {
    const { data } = await admin.from("tournaments").select(SELECT).eq("id", body.tournament_id).maybeSingle();
    if (!data) return json({ error: "Tournament not found" }, 404);
    candidates = [data];
  } else {
    const delay = Number(config.delay_days || 7);
    const { data } = await admin
      .from("tournaments")
      .select(SELECT)
      .eq("post_event_email_sent", false)
      .eq("post_event_email_opt_out", false)
      .limit(300);
    const now = Date.now();
    const DAY = 86400000;
    candidates = (data || []).filter((t: any) => {
      const raw = t.end_date || t.date;
      if (!raw) return false;
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T23:59:59` : String(raw);
      const endMs = new Date(iso).getTime();
      if (Number.isNaN(endMs)) return false;
      const dueMs = endMs + delay * DAY;
      // due now, but don't back-fill events that ended long ago
      return dueMs <= now && now - dueMs < 3 * DAY;
    });
  }

  const results: any[] = [];

  for (const t of candidates) {
    if (!testEmail && !body.force && (t.post_event_email_sent || t.post_event_email_opt_out)) {
      results.push({ tournament_id: t.id, skipped: t.post_event_email_opt_out ? "opted_out" : "already_sent" });
      continue;
    }

    const { data: org } = await admin.from("organizations").select("name").eq("id", t.organization_id).maybeSingle();
    const to = testEmail || (await organizerEmail(admin, t));
    if (!to) {
      results.push({ tournament_id: t.id, error: "no organizer email" });
      continue;
    }

    const { subject, html } = buildPostEventOrganizerEmail({
      config,
      organizerName: org?.name || "Organizer",
      tournamentName: t.title,
      slug: t.slug,
    });

    const bcc = Array.from(
      new Set(
        [...(config.bcc || []), ...(config.extra_recipients || [])]
          .map((e) => String(e).trim().toLowerCase())
          .filter(Boolean)
          .filter((e) => e !== String(to).toLowerCase()),
      ),
    );

    const res = await sendAndLog(
      admin,
      apiKey,
      {
        to: [to],
        ...(bcc.length ? { bcc } : {}),
        reply_to: ADMIN_EMAIL,
        subject: testEmail ? `[TEST] ${subject}` : subject,
        html,
      },
      {
        templateName: "post-event-organizer-thank-you",
        source: "post-event-organizer-email",
        organizationId: t.organization_id,
        tournamentId: t.id,
      },
    );

    if (res.ok && !testEmail) {
      await admin
        .from("tournaments")
        .update({ post_event_email_sent: true, post_event_email_sent_at: new Date().toISOString() } as any)
        .eq("id", t.id);
    }

    results.push({ tournament_id: t.id, to, ok: res.ok, error: res.error ?? null });
  }

  return json({ ok: true, count: results.length, results });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

export const Route = createFileRoute("/api/public/post-event-organizer-email")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        }),
      POST: ({ request }) => handle(request),
    },
  },
});

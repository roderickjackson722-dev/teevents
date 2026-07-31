// Sends the league event registration confirmation email to the player, plus a
// notification copy to the league managers and the TeeVents admin inbox.
// Called from the public registration page (free events), from the Stripe
// league webhook (paid events), from the league manager dashboard ("resend"),
// and used for backfilling past registrations.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const ADMIN_EMAIL = "info@teevents.golf";
const SITE = "https://www.teevents.golf";

type EmailConfig = {
  subject?: string;
  greeting?: string;
  body_text?: string;
  closing_text?: string;
  footer_text?: string;
  header_bg_color?: string;
  text_color?: string;
  button_text?: string;
  show_button?: boolean;
};

export const DEFAULT_LEAGUE_EVENT_EMAIL: Required<EmailConfig> = {
  subject: "You're Registered — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text:
    "You're all set for {{event_name}} with {{league_name}}.\n\n📅 Date: {{event_date}}\n📍 Course: {{course_name}}\n⏰ Tee Time: {{tee_time}}\n💵 Amount Paid: {{amount_paid}}\n🔑 Your Member Code: {{scoring_code}}",
  closing_text:
    "Please arrive 30 minutes before your tee time. You can enter scores during the round with your member code.",
  footer_text: "See you on the course! ⛳",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  button_text: "View My League Portal",
  show_button: true,
};

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fill(text: string, vars: Record<string, string>) {
  return String(text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
}

function money(cents?: number | null) {
  return `$${(((cents ?? 0) as number) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function prettyDate(d?: string | null) {
  if (!d) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function paragraphs(text: string, color: string) {
  return String(text || "")
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:${color};font-size:15px;line-height:1.7;">${block
          .split("\n")
          .map((l) => esc(l))
          .join("<br />")}</p>`,
    )
    .join("");
}

function buildPlayerHtml(cfg: Required<EmailConfig>, vars: Record<string, string>, buttonUrl: string) {
  const text = cfg.text_color;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:560px;">
  <tr><td style="background:${cfg.header_bg_color};padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${esc(fill(cfg.subject, vars))}</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 14px;color:${text};font-size:16px;font-weight:600;">${esc(fill(cfg.greeting, vars))}</p>
    ${paragraphs(fill(cfg.body_text, vars), text)}
    ${paragraphs(fill(cfg.closing_text, vars), text)}
    ${cfg.show_button && buttonUrl ? `<p style="margin:24px 0;"><a href="${buttonUrl}" style="background:#F5A623;color:#1a5c38;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;">${esc(fill(cfg.button_text, vars))}</a></p>` : ""}
    <p style="margin:18px 0 0;color:${text};font-size:15px;">${esc(fill(cfg.footer_text, vars))}</p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a> | <a href="mailto:info@teevents.golf" style="color:#9ca3af;">Need help? Contact support</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function buildManagerHtml(title: string, rows: Array<[string, unknown]>) {
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && String(v) !== "")
    .map(
      ([l, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap;">${esc(l)}</td><td style="padding:6px 0;color:#111827;font-size:14px;">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:560px;">
  <tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${esc(title)}</h1></td></tr>
  <tr><td style="padding:24px 32px;">
    <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
      <p style="margin:0 0 8px;color:#1a5c38;font-size:14px;font-weight:700;">📝 Full Registration Details</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${body}</table>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

async function sendAndLog(
  admin: ReturnType<typeof createClient>,
  apiKey: string,
  payload: { to: string[]; bcc?: string; subject: string; html: string },
  meta: { templateName: string; source: string; organizationId?: string | null },
) {
  let status = "sent";
  let resendId: string | null = null;
  let errorMessage: string | null = null;
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
      } as any);
    } catch {
      /* logging is best-effort */
    }
  }
  return { ok: status === "sent", error: errorMessage };
}

async function handle(request: Request) {
  const apiKey = process.env["RESEND_API_KEY"];
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) return json({ error: "Server not configured" }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const registrationId: string | undefined = body.registration_id;
  const eventId: string | undefined = body.event_id;
  const memberId: string | undefined = body.member_id;
  const force = body.force === true;

  let reg: any = null;
  if (registrationId) {
    const { data } = await admin.from("league_event_registrations").select("*").eq("id", registrationId).maybeSingle();
    reg = data;
  } else if (eventId && memberId) {
    const { data } = await admin
      .from("league_event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .maybeSingle();
    reg = data;
  }
  if (!reg) return json({ error: "Registration not found" }, 404);
  if (reg.confirmation_email_sent_at && !force) return json({ ok: true, skipped: "already_sent" });

  const [{ data: event }, { data: member }] = await Promise.all([
    admin.from("league_events").select("*").eq("id", reg.event_id).maybeSingle(),
    admin.from("league_members").select("*").eq("id", reg.member_id).maybeSingle(),
  ]);
  if (!event || !member) return json({ error: "Event or member missing" }, 404);

  const { data: league } = await admin
    .from("golf_leagues")
    .select("id, league_name, league_slug, organization_id, event_confirmation_email_config")
    .eq("id", (event as any).league_id)
    .maybeSingle();

  const cfg: Required<EmailConfig> = {
    ...DEFAULT_LEAGUE_EVENT_EMAIL,
    ...(((league as any)?.event_confirmation_email_config as EmailConfig) || {}),
  };

  const firstName = String((member as any).member_name || "").trim().split(/\s+/)[0] || "there";
  const slug = (league as any)?.league_slug;
  const code = (member as any).scoring_code;
  const portalUrl = slug && code ? `${SITE}/league/${slug}/me/${code}?event=${reg.event_id}` : slug ? `${SITE}/league/${slug}` : SITE;

  const vars: Record<string, string> = {
    first_name: firstName,
    member_name: String((member as any).member_name || ""),
    league_name: String((league as any)?.league_name || "your league"),
    event_name: String((event as any).event_name || "league event"),
    event_date: prettyDate((event as any).event_date),
    course_name: String((event as any).course_name || (event as any).location || ""),
    tee_time: String(reg.tee_time || "To be announced"),
    amount_paid: money(reg.fee_tier_amount_cents ?? (event as any).entry_fee_cents),
    scoring_code: String(code || ""),
    portal_url: portalUrl,
    league_url: slug ? `${SITE}/league/${slug}` : SITE,
  };

  const results: Record<string, unknown> = {};

  if (!apiKey) return json({ error: "Email service not configured" }, 500);

  // 1. Player confirmation (admin inbox silently BCC'd for tracking)
  if ((member as any).email) {
    const r = await sendAndLog(
      admin,
      apiKey,
      {
        to: [String((member as any).email)],
        bcc: ADMIN_EMAIL,
        subject: fill(cfg.subject, vars),
        html: buildPlayerHtml(cfg, vars, portalUrl),
      },
      { templateName: "league-event-confirmation", source: "league-event-confirmation", organizationId: (league as any)?.organization_id },
    );
    results.player = r;
  }

  // 2. League managers (org owners/admins) + admin copy
  const recipients = new Set<string>();
  if ((league as any)?.organization_id) {
    const { data: orgMembers } = await admin
      .from("org_members")
      .select("user_id, role")
      .eq("organization_id", (league as any).organization_id);
    for (const m of ((orgMembers as any[]) || [])) {
      if (!["owner", "admin"].includes(String(m.role || "").toLowerCase())) continue;
      try {
        const { data: u } = await admin.auth.admin.getUserById(m.user_id);
        const email = u?.user?.email;
        if (email) recipients.add(String(email).trim().toLowerCase());
      } catch {
        /* ignore */
      }
    }
  }
  if (recipients.size === 0) recipients.add(ADMIN_EMAIL);

  results.managers = await sendAndLog(
    admin,
    apiKey,
    {
      to: Array.from(recipients),
      bcc: ADMIN_EMAIL,
      subject: `✅ Event Registration — ${vars.event_name} (${vars.member_name})`,
      html: buildManagerHtml("New League Event Registration 🎉", [
        ["League", vars.league_name],
        ["Event", vars.event_name],
        ["Event Date", vars.event_date],
        ["Member", vars.member_name],
        ["Email", (member as any).email],
        ["Phone", (member as any).phone],
        ["Handicap Index", (member as any).handicap_index],
        ["Member Code", vars.scoring_code],
        ["Team Name", reg.team_name],
        ["Fee Option", reg.fee_tier_label],
        ["Amount", vars.amount_paid],
        ["Payment Status", reg.fee_paid ? "PAID" : "Unpaid"],
        ["Tee Time", reg.tee_time],
        ["Status", reg.status],
        ["Registered At", prettyDate(reg.created_at)],
      ]),
    },
    { templateName: "league-event-registration-manager", source: "league-event-confirmation", organizationId: (league as any)?.organization_id },
  );

  await admin
    .from("league_event_registrations")
    .update({ confirmation_email_sent_at: new Date().toISOString() } as any)
    .eq("id", reg.id);

  return json({ ok: true, registration_id: reg.id, results });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" },
  });
}

export const Route = createFileRoute("/api/public/league-event-confirmation")({
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

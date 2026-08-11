// Emails league members a direct registration link for a specific league event.
// The link opens a code-entry page where the member enters their 6-character
// login code to unlock registration (their personal code is included too).
// Requires a signed-in league manager / platform admin.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const SITE = "https://www.teevents.golf";

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

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(d: string | null) {
  if (!d) return "";
  const [y, m, day] = String(d).split("-").map(Number);
  if (!y || !m || !day) return String(d);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildEventRegistrationLinkHtml(opts: {
  memberName: string;
  leagueName: string;
  eventName: string;
  eventDate: string | null;
  courseName?: string | null;
  feeLine?: string | null;
  gateUrl: string;
  directUrl: string;
  code: string | null;
}) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#374151;">
    <div style="background:#1a5c38;color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:20px;">Register for ${esc(opts.eventName)}</h2>
      <p style="margin:6px 0 0;font-size:14px;opacity:.9;">${esc(opts.leagueName)}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p>Hello ${esc(opts.memberName)},</p>
      <p>Here is your direct registration link for <strong>${esc(opts.eventName)}</strong>${
        opts.eventDate ? ` on ${esc(fmtDate(opts.eventDate))}` : ""
      }${opts.courseName ? ` at ${esc(opts.courseName)}` : ""}.</p>
      ${opts.feeLine ? `<p style="margin:0 0 16px;"><strong>Entry:</strong> ${esc(opts.feeLine)}</p>` : ""}
      <p style="margin:24px 0;">
        <a href="${esc(opts.gateUrl)}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Register for This Event
        </a>
      </p>
      <p style="font-size:14px;">When the page opens, enter your member login code to continue:</p>
      <p style="font-size:22px;font-family:monospace;letter-spacing:4px;font-weight:bold;color:#1a5c38;margin:8px 0 20px;">
        ${esc(opts.code || "— ask your league manager for your code —")}
      </p>
      ${
        opts.code
          ? `<p style="font-size:14px;color:#6b7280;">Prefer one click? <a href="${esc(opts.directUrl)}" style="color:#1a5c38;">Use this link</a> — your code is already filled in.</p>`
          : ""
      }
      <p style="font-size:14px;color:#6b7280;">Questions? Just reply to this email and your league manager will help.</p>
      <p style="margin-top:24px;">Best,<br/>TeeVents Golf Management</p>
    </div>
  </div>`;
}

async function handle(request: Request) {
  const apiKey = process.env["RESEND_API_KEY"];
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  if (!apiKey) return json({ error: "Email is not configured" }, 500);

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const body = (await request.json().catch(() => ({}))) as {
    event_id?: string;
    member_ids?: string[];
  };
  if (!body.event_id) return json({ error: "event_id is required" }, 400);

  const { data: event } = await admin
    .from("league_events")
    .select("id, event_name, event_date, course_name, league_id, registration_fee_cents, fee_tiers")
    .eq("id", body.event_id)
    .maybeSingle();
  if (!event) return json({ error: "Event not found" }, 404);

  const { data: league } = await admin
    .from("golf_leagues")
    .select("id, league_name, league_slug, organization_id")
    .eq("id", (event as any).league_id)
    .maybeSingle();
  if (!league) return json({ error: "League not found" }, 404);

  const [{ data: membership }, { data: adminRole }] = await Promise.all([
    admin.from("org_members").select("id").eq("user_id", caller.id).eq("organization_id", (league as any).organization_id).maybeSingle(),
    admin.from("user_roles").select("id").eq("user_id", caller.id).eq("role", "admin").maybeSingle(),
  ]);
  if (!membership && !adminRole) return json({ error: "Forbidden" }, 403);

  let q = admin
    .from("league_members")
    .select("id, member_name, email, scoring_code")
    .eq("league_id", (league as any).id);
  if (body.member_ids?.length) q = q.in("id", body.member_ids);
  const { data: members } = await q;

  const tiers: Array<{ label: string; amount_cents: number }> = Array.isArray((event as any).fee_tiers)
    ? (event as any).fee_tiers
    : [];
  const feeLine = tiers.length
    ? tiers.map((t) => `${t.label} $${(Number(t.amount_cents || 0) / 100).toFixed(2)}`).join(" • ")
    : (event as any).registration_fee_cents
      ? `$${(Number((event as any).registration_fee_cents) / 100).toFixed(2)}`
      : "No entry fee";

  const slug = (league as any).league_slug;
  const gateUrl = `${SITE}/league/${slug}/register-code?event=${(event as any).id}`;
  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const m of members ?? []) {
    const email = (m as any).email as string | null;
    if (!email) continue;
    const code = ((m as any).scoring_code || "") as string;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        reply_to: "info@teevents.golf",
        subject: `Register — ${(event as any).event_name} (${(league as any).league_name})`,
        html: buildEventRegistrationLinkHtml({
          memberName: (m as any).member_name,
          leagueName: (league as any).league_name,
          eventName: (event as any).event_name,
          eventDate: (event as any).event_date,
          courseName: (event as any).course_name,
          feeLine,
          gateUrl,
          directUrl: code
            ? `${SITE}/league/${slug}/register/${code.toUpperCase()}?event=${(event as any).id}`
            : gateUrl,
          code: code ? code.toUpperCase() : null,
        }),
      }),
    });
    results.push({ email, ok: res.ok, error: res.ok ? undefined : await res.text() });
  }

  return json({ ok: true, sent: results.filter((r) => r.ok).length, results });
}

export const Route = createFileRoute("/api/public/league-event-registration-link")({
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

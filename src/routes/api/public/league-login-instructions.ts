// Emails league members their login instructions: sign in with their email
// address or with their 6-character login code. Called from the league manager
// dashboard (Players tab). Requires a signed-in league manager / platform admin.
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

export function buildLoginEmailHtml(opts: {
  memberName: string;
  leagueName: string;
  loginUrl: string;
  code: string | null;
  email: string;
}) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#374151;">
    <div style="background:#1a5c38;color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:20px;">Your ${esc(opts.leagueName)} Login Access</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p>Hello ${esc(opts.memberName)},</p>
      <p>You have been added to the <strong>${esc(opts.leagueName)}</strong>. To access your league page, you can log in using either:</p>
      <ol style="padding-left:18px;">
        <li style="margin-bottom:8px;"><strong>Email Login:</strong> use your email address <strong>${esc(opts.email)}</strong> on the login page — no password needed.</li>
        <li><strong>Login Code:</strong> ${
          opts.code
            ? `use your personal code <strong style="font-family:monospace;letter-spacing:2px;">${esc(opts.code)}</strong> for quick access.`
            : `ask your league manager to assign you a personal login code.`
        }</li>
      </ol>
      <p style="margin:24px 0;">
        <a href="${esc(opts.loginUrl)}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Set Up Your Login
        </a>
      </p>
      <p style="font-size:14px;color:#6b7280;">Once set up, you can log in anytime using your email or your login code.</p>
      <p style="font-size:14px;color:#6b7280;">If you have any questions, contact your league manager.</p>
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
    league_id?: string;
    member_ids?: string[];
  };
  if (!body.league_id) return json({ error: "league_id is required" }, 400);

  const { data: league } = await admin
    .from("golf_leagues")
    .select("id, league_name, league_slug, organization_id")
    .eq("id", body.league_id)
    .maybeSingle();
  if (!league) return json({ error: "League not found" }, 404);

  // Caller must manage this league's organization (or be a platform admin).
  const [{ data: membership }, { data: adminRole }] = await Promise.all([
    admin.from("org_members").select("id").eq("user_id", caller.id).eq("organization_id", (league as any).organization_id).maybeSingle(),
    admin.from("user_roles").select("id").eq("user_id", caller.id).eq("role", "admin").maybeSingle(),
  ]);
  if (!membership && !adminRole) return json({ error: "Forbidden" }, 403);

  let q = admin
    .from("league_members")
    .select("id, member_name, email, scoring_code")
    .eq("league_id", league.id);
  if (body.member_ids?.length) q = q.in("id", body.member_ids);
  const { data: members } = await q;

  const loginBaseUrl = `${SITE}/league/${(league as any).league_slug}/score`;
  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const m of members ?? []) {
    const email = (m as any).email as string | null;
    if (!email) continue;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        reply_to: "info@teevents.golf",
        subject: `Your ${(league as any).league_name} — Login Access`,
        html: buildLoginEmailHtml({
          memberName: (m as any).member_name,
          leagueName: (league as any).league_name,
          loginUrl: `${loginBaseUrl}?email=${encodeURIComponent(email)}`,
          code: (m as any).scoring_code || null,
          email,
        }),
      }),
    });
    results.push({ email, ok: res.ok, error: res.ok ? undefined : await res.text() });
  }

  return json({ ok: true, sent: results.filter((r) => r.ok).length, results });
}

export const Route = createFileRoute("/api/public/league-login-instructions")({
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

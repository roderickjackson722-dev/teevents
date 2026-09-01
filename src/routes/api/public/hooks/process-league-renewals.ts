// Daily golf-league subscription renewal reminders.
//
// A league's $399/year subscription starts on the date of its first league event
// and renews one year later (golf_leagues.subscription_end_date). This hook runs
// once a day (pg_cron) and emails the league organizer at 30 days, 7 days, and on
// the renewal date itself, recording which reminder was sent so none repeat.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const TEAM_INBOX = "info@teevents.golf";
const SITE = "https://www.teevents.golf";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

type Stage = 30 | 7 | 0;

const FLAG: Record<Stage, string> = {
  30: "subscription_reminder_sent_30d",
  7: "subscription_reminder_sent_7d",
  0: "subscription_reminder_sent_0d",
};

function emailHtml(leagueName: string, renewsOn: string, stage: Stage) {
  const headline =
    stage === 0
      ? `${leagueName} renews today`
      : `${leagueName} renews in ${stage} days`;
  const body =
    stage === 0
      ? `Your TeeVents league subscription for <strong>${leagueName}</strong> renews today (${renewsOn}). Renew now to keep your league schedule, standings and player logins live.`
      : `Your TeeVents league subscription for <strong>${leagueName}</strong> renews on <strong>${renewsOn}</strong>. That's $399 for another year — up to 24 league events, plus the 5% platform fee on paid registrations.`;
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <div style="background:#1a5c38;padding:20px 24px;color:#ffffff">
      <h1 style="margin:0;font-size:20px">${headline}</h1>
    </div>
    <div style="padding:24px;font-size:15px;line-height:1.6">
      <p style="margin:0 0 16px">${body}</p>
      <p style="margin:0 0 24px">Nothing changes for your players — your league page, leaderboards and scoring codes stay exactly as they are.</p>
      <a href="${SITE}/dashboard/leagues" style="display:inline-block;background:#F5A623;color:#1a5c38;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">Manage your league subscription</a>
      <p style="margin:24px 0 0;font-size:13px;color:#57534e">Questions? Just reply to this email and we'll help.</p>
    </div>
  </div>
</body></html>`;
}

/** Email of the organization owner (falls back to any admin member). */
async function ownerEmail(admin: any, organizationId: string): Promise<string | null> {
  const { data: members } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
    .limit(5);
  const sorted = (members ?? []).sort((a: any, b: any) =>
    a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0,
  );
  for (const m of sorted) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    if (data?.user?.email) return data.user.email as string;
  }
  return null;
}

async function run() {
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return json({ error: "Email is not configured." }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: leagues, error } = await admin
    .from("golf_leagues")
    .select(
      "id, league_name, organization_id, subscription_end_date, subscription_status, subscription_reminder_sent_30d, subscription_reminder_sent_7d, subscription_reminder_sent_0d",
    )
    .not("subscription_end_date", "is", null)
    .limit(500);

  if (error) return json({ error: error.message }, 500);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const results: Array<{ league: string; stage: Stage; status: string }> = [];

  for (const l of (leagues as any[]) ?? []) {
    if (l.subscription_status === "canceled") continue;
    const end = new Date(`${String(l.subscription_end_date).slice(0, 10)}T00:00:00Z`);
    const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000);

    let stage: Stage | null = null;
    if (daysLeft === 30) stage = 30;
    else if (daysLeft === 7) stage = 7;
    else if (daysLeft <= 0) stage = 0;
    if (stage === null) continue;
    if (l[FLAG[stage]]) continue;

    const to = await ownerEmail(admin, l.organization_id);
    if (!to) continue;

    const renewsOn = end.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

    const ok = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [to],
        reply_to: TEAM_INBOX,
        subject:
          stage === 0
            ? `${l.league_name}: your TeeVents league subscription renews today`
            : `${l.league_name}: your TeeVents league subscription renews in ${stage} days`,
        html: emailHtml(l.league_name, renewsOn, stage),
      }),
    })
      .then((r) => r.ok)
      .catch(() => false);

    if (ok) {
      await admin
        .from("golf_leagues")
        .update({ [FLAG[stage]]: true })
        .eq("id", l.id);
    }

    results.push({ league: l.league_name, stage, status: ok ? "sent" : "failed" });
  }

  return json({
    checked: (leagues as any[])?.length ?? 0,
    sent: results.filter((r) => r.status === "sent").length,
    results,
  });
}

export const Route = createFileRoute("/api/public/hooks/process-league-renewals")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: () => run(),
      POST: () => run(),
    },
  },
});

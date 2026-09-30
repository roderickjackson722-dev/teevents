// Delivers due scheduled program communications (private RFP module).
//
// Picks rows from public.rfp_communications where status = 'scheduled' and
// scheduled_for <= now(), resolves the recipient list the same way the admin
// "send now" path does, then sends email (Resend) or text (Twilio) and marks
// the row sent / partial / failed.
//
// Runs hourly from pg_cron.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const FROM_EMAIL = "TeeVents <info@teevents.golf>";

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

async function sendEmail(to: string, subject: string, message: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { ok: false, error: "Email service is not configured" };
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">${message.replace(/\n/g, "<br/>")}</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) return { ok: false, error: `Email send failed (${res.status})` };
  return { ok: true };
}

async function sendSms(to: string, body: string) {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_PHONE_NUMBER"];
  if (!sid || !token || !from) return { ok: false, error: "Text messaging is not configured" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!res.ok) return { ok: false, error: `Text send failed (${res.status})` };
  return { ok: true };
}

async function recipientsFor(admin: any, job: any): Promise<string[]> {
  let list: string[] = [];
  if (job.recipient_type === "coaches") {
    let q = admin.from("season_teams").select("coach_email, season_id");
    if (job.season_id) q = q.eq("season_id", job.season_id);
    const { data } = await q;
    list = ((data ?? []) as any[]).map((t) => t.coach_email).filter(Boolean);
  } else {
    let q = admin.from("rfp_registrations").select("participant_email, participant_phone, season_id, team_id");
    if (job.season_id) q = q.eq("season_id", job.season_id);
    if (job.team_id) q = q.eq("team_id", job.team_id);
    const { data } = await q;
    list = ((data ?? []) as any[])
      .map((r) => (job.communication_type === "sms" ? r.participant_phone : r.participant_email))
      .filter(Boolean);
  }
  return Array.from(new Set(list.map((v) => String(v))));
}

async function run() {
  const admin = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false },
  });

  const { data: due, error } = await admin
    .from("rfp_communications")
    .select("id, season_id, team_id, recipient_type, communication_type, subject, message")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(25);

  if (error) return json({ error: error.message }, 500);

  const results: Array<{ id: string; status: string; sent?: number; failed?: number; error?: string }> = [];

  for (const job of (due ?? []) as any[]) {
    // Claim first so overlapping runs never double-send.
    const { data: claimed } = await admin
      .from("rfp_communications")
      .update({ status: "sending" })
      .eq("id", job.id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const recipients = await recipientsFor(admin, job);
    if (recipients.length === 0) {
      await admin
        .from("rfp_communications")
        .update({ status: "failed", error_message: "No recipients matched that selection", recipient_count: 0 })
        .eq("id", job.id);
      results.push({ id: job.id, status: "failed", error: "No recipients" });
      continue;
    }

    let failures = 0;
    let lastError: string | null = null;
    for (const to of recipients) {
      const result =
        job.communication_type === "sms"
          ? await sendSms(to, job.message)
          : await sendEmail(to, job.subject || "Program update", job.message);
      if (!result.ok) {
        failures++;
        lastError = result.error || "Send failed";
      }
    }

    const status = failures === recipients.length ? "failed" : failures ? "partial" : "sent";
    await admin
      .from("rfp_communications")
      .update({
        status,
        sent_at: new Date().toISOString(),
        recipient_count: recipients.length,
        error_message: lastError,
      })
      .eq("id", job.id);

    results.push({ id: job.id, status, sent: recipients.length - failures, failed: failures });
  }

  return json({ processed: results.length, results });
}

export const Route = createFileRoute("/api/public/hooks/process-rfp-communications")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: () => run(),
      POST: () => run(),
    },
  },
});

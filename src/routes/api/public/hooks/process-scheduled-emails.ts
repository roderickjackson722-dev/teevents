// Sends due scheduled template emails (organizer / admin "schedule this email" feature).
// Picks rows from public.scheduled_emails where status = 'scheduled' and
// scheduled_for <= now(), then invokes the matching email function.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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

async function run() {
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: due, error } = await admin
    .from("scheduled_emails")
    .select("id, tournament_id, template_kind, recipient_ids")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(25);

  if (error) return json({ error: error.message }, 500);

  const results: Array<{ id: string; status: string; sent?: number; error?: string }> = [];

  for (const job of (due ?? []) as any[]) {
    // Claim the row first so overlapping cron runs never double-send.
    const { data: claimed } = await admin
      .from("scheduled_emails")
      .update({ status: "sending" })
      .eq("id", job.id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const ids: string[] | null = Array.isArray(job.recipient_ids) && job.recipient_ids.length > 0
      ? job.recipient_ids
      : null;

    const isDayBefore = job.template_kind === "day_before";
    const fnName = isDayBefore ? "send-day-before-reminder" : "resend-confirmation";
    const body: Record<string, unknown> = isDayBefore
      ? { tournament_id: job.tournament_id }
      : { use_custom_template: true, template_kind: job.template_kind, tournament_id: job.tournament_id };
    if (ids) body["registration_ids"] = ids;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify(body),
      });
      const payload: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Send failed (${res.status})`);

      await admin
        .from("scheduled_emails")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: payload?.sent ?? null,
          failed_count: payload?.failed ?? null,
          error: null,
        })
        .eq("id", job.id);
      results.push({ id: job.id, status: "sent", sent: payload?.sent ?? 0 });
    } catch (e: any) {
      await admin
        .from("scheduled_emails")
        .update({ status: "failed", error: e?.message || "Send failed" })
        .eq("id", job.id);
      results.push({ id: job.id, status: "failed", error: e?.message });
    }
  }

  return json({ processed: results.length, results });
}

export const Route = createFileRoute("/api/public/hooks/process-scheduled-emails")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: () => run(),
      POST: () => run(),
    },
  },
});

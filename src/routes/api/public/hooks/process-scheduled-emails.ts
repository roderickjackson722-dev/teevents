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
    .select("id, tournament_id, template_kind, recipient_ids, test_email")
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

    let ids: string[] | null = Array.isArray(job.recipient_ids) && job.recipient_ids.length > 0
      ? job.recipient_ids.map((x: unknown) => String(x))
      : null;

    /**
     * Test sends deliver ONE copy of the selected template to a single address
     * (the organizer / platform team) instead of the player list. They always
     * render through resend-confirmation so the saved template design is used.
     */
    const testEmail = String(job.test_email || "").trim();
    const isDayBefore = job.template_kind === "day_before" && !testEmail;
    const fnName = isDayBefore ? "send-day-before-reminder" : "resend-confirmation";

    // Everyone: resolve the tournament's registrants (the confirmation-style
    // function requires an explicit id list).
    if (!isDayBefore && (!ids || testEmail)) {
      const { data: regs } = await admin
        .from("tournament_registrations")
        .select("id, email")
        .eq("tournament_id", job.tournament_id);
      const candidates = ((regs ?? []) as any[]).filter((r) => r.email);
      // A test send only needs one registration to pull sample data from.
      ids = testEmail
        ? (ids && ids.length > 0 ? ids.slice(0, 1) : candidates.slice(0, 1).map((r) => r.id))
        : candidates.map((r) => r.id);
      if (!ids || ids.length === 0) {
        await admin
          .from("scheduled_emails")
          .update({ status: "failed", error: "No registrants with an email address" })
          .eq("id", job.id);
        results.push({ id: job.id, status: "failed", error: "No recipients" });
        continue;
      }
    }

    const body: Record<string, unknown> = isDayBefore
      ? { tournament_id: job.tournament_id, service_run: true }
      : { use_custom_template: true, template_kind: job.template_kind, tournament_id: job.tournament_id, service_run: true };
    if (ids) body["registration_ids"] = ids;
    if (testEmail && ids) {
      body["email_overrides"] = Object.fromEntries(ids.map((id) => [id, testEmail]));
    }

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

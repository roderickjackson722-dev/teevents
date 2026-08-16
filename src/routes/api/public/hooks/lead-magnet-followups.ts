// Sends due lead-magnet follow-up emails (3-day sample offer reminders).
// Cron-invokable and triggerable from Admin Dashboard → Lead Magnets → Leads.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sampleOfferEmailHtml } from "@/lib/leadMagnetEmails";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const TEAM_INBOX = "info@teevents.golf";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
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
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return json({ error: "Email is not configured." }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: due, error } = await admin
    .from("lead_magnet_followups")
    .select("id, email_type, lead:lead_magnet_leads(id, full_name, email, lead_magnet_id)")
    .is("sent_at", null)
    .lte("scheduled_for", new Date().toISOString())
    .limit(50);

  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const row of due ?? []) {
    const lead = (row as any).lead;
    if (!lead?.email) continue;

    let title = "TeeVents resource";
    if (lead.lead_magnet_id) {
      const { data: magnet } = await admin
        .from("lead_magnets")
        .select("title")
        .eq("id", lead.lead_magnet_id)
        .maybeSingle();
      if (magnet?.title) title = magnet.title;
    }

    const ok = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [lead.email],
        reply_to: TEAM_INBOX,
        subject: "See what your tournament could look like",
        html: sampleOfferEmailHtml({ name: lead.full_name, title }),
      }),
    })
      .then((r) => r.ok)
      .catch(() => false);

    await admin
      .from("lead_magnet_followups")
      .update({ sent_at: ok ? new Date().toISOString() : null, error: ok ? null : "Send failed" })
      .eq("id", row.id);

    if (ok) sent += 1;
    results.push({ id: row.id, status: ok ? "sent" : "failed" });
  }

  return json({ processed: results.length, sent, results });
}

export const Route = createFileRoute("/api/public/hooks/lead-magnet-followups")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: () => run(),
      POST: () => run(),
    },
  },
});

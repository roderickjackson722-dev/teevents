// Daily custom-domain renewal sweep.
// - renewal_due (30 days before expiry): send renewal notice #1 once per cycle
// - archived (expiry reached, default event end + 60 days): send final notice #2 once;
//   the CustomDomainRouter redirects visitors to the TeeVents event page.
// Caller must present the token stored in internal_cron_tokens('domain_renewal').
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { domainStage } from "@/lib/domainRenewal";
import { buildDomainArchivedNotice, buildDomainRenewalNotice } from "@/lib/domainRenewalEmail";

const SENDER = "TeeVents Golf <info@notifications.teevents.golf>";
const ADMIN_EMAIL = "info@teevents.golf";

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

async function organizerEmail(admin: any, t: any): Promise<string | null> {
  if (t.contact_email) return String(t.contact_email).trim();
  const { data: owner } = await admin
    .from("org_members").select("user_id").eq("organization_id", t.organization_id).eq("role", "owner").limit(1).maybeSingle();
  if (!owner?.user_id) return null;
  const { data } = await admin.auth.admin.getUserById(owner.user_id);
  return data?.user?.email ?? null;
}

async function send(admin: any, apiKey: string, t: any, to: string, subject: string, html: string, template: string) {
  let status = "sent";
  let error: string | null = null;
  let resendId: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: SENDER, to: [to], bcc: [ADMIN_EMAIL], reply_to: ADMIN_EMAIL, subject, html }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) { status = "failed"; error = data?.message || `Resend HTTP ${res.status}`; } else resendId = data?.id ?? null;
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }
  await admin.from("email_send_log").insert({
    message_id: crypto.randomUUID(), template_name: template, recipient_email: to, subject, status,
    source: "process-domain-renewals", resend_id: resendId, error_message: error,
    organization_id: t.organization_id, tournament_id: t.id,
  } as any).then(() => {}, () => {});
  return status === "sent";
}

async function handle(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const apiKey = process.env["RESEND_API_KEY"];
  if (!url || !serviceKey || !apiKey) return json({ error: "Server not configured" }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const token = (request.headers.get("x-cron-token") || "").trim();
  const { data: row } = await admin.from("internal_cron_tokens").select("token").eq("name", "domain_renewal").maybeSingle();
  if (!token || !row?.token || token !== row.token) return json({ error: "Unauthorized" }, 401);

  const { data: rows, error } = await admin
    .from("tournaments")
    .select("id, title, slug, date, end_date, organization_id, contact_email, custom_domain, custom_domain_expires_at, custom_domain_notice1_sent_at, custom_domain_notice2_sent_at")
    .not("custom_domain", "is", null)
    .limit(500);
  if (error) return json({ error: error.message }, 500);

  const results: any[] = [];
  const now = Date.now();
  for (const t of (rows ?? []) as any[]) {
    const stage = domainStage(t, now);
    const due =
      (stage === "renewal_due" && !t.custom_domain_notice1_sent_at) ? "notice1" :
      (stage === "archived" && t.custom_domain_notice1_sent_at && !t.custom_domain_notice2_sent_at) ? "notice2" : null;
    if (!due) continue;

    const to = await organizerEmail(admin, t);
    if (!to) { results.push({ id: t.id, error: "no organizer email" }); continue; }
    const { data: org } = await admin.from("organizations").select("name").eq("id", t.organization_id).maybeSingle();
    const input = {
      organizerName: (org as any)?.name || "Organizer",
      tournamentName: t.title || "your tournament",
      domain: t.custom_domain,
      slug: t.slug,
      tournamentId: t.id,
    };
    const { subject, html } = due === "notice1" ? buildDomainRenewalNotice(input) : buildDomainArchivedNotice(input);
    const ok = await send(admin, apiKey, t, to, subject, html, due === "notice1" ? "custom-domain-renewal-notice" : "custom-domain-archived-notice");
    if (ok) {
      const col = due === "notice1" ? "custom_domain_notice1_sent_at" : "custom_domain_notice2_sent_at";
      const update: Record<string, string> = { [col]: new Date().toISOString() };
      await admin.from("tournaments").update(update as any).eq("id", t.id);
    }
    results.push({ id: t.id, sent: due, ok });
  }
  return json({ ok: true, results });
}

export const Route = createFileRoute("/api/public/hooks/process-domain-renewals")({
  server: { handlers: { POST: async ({ request }) => handle(request) } },
});

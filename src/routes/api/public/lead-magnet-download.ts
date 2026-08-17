// Public lead-magnet capture endpoint.
//
// Stores a lead against a published lead magnet, increments its download count,
// creates a signed download link for the attached file (if any), emails the
// lead their copy plus a sample offer, and schedules the 3-day follow-up.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { confirmationEmailHtml } from "@/lib/leadMagnetEmails";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const TEAM_INBOX = "info@teevents.golf";
const SITE = "https://www.teevents.golf";
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const schema = z.object({
  slug: z.string().trim().min(1).max(200),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organization_name: z.string().trim().max(160).optional().or(z.literal("")),
  tournament_name: z.string().trim().max(200).optional().or(z.literal("")),
  tournament_date: z.string().trim().max(20).optional().or(z.literal("")),
  expected_players: z.number().int().min(0).max(100000).nullable().optional(),
  current_tools: z.string().trim().max(200).optional().or(z.literal("")),
  challenge: z.string().trim().max(2000).optional().or(z.literal("")),
});

async function handle(request: Request) {
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  const apiKey = process.env["RESEND_API_KEY"];

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Please check the form and try again." }, 400);
  const d = parsed.data;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: magnet } = await admin
    .from("lead_magnets")
    .select("id, title, slug, file_url, article_type, download_count, is_published")
    .eq("slug", d.slug)
    .maybeSingle();

  if (!magnet || !magnet.is_published) return json({ error: "Resource not found." }, 404);

  const { data: lead, error: leadError } = await admin
    .from("lead_magnet_leads")
    .insert({
      lead_magnet_id: magnet.id,
      full_name: d.full_name,
      email: d.email,
      phone: d.phone || null,
      organization_name: d.organization_name || null,
      tournament_name: d.tournament_name || null,
      tournament_date: d.tournament_date || null,
      expected_players: d.expected_players ?? null,
      current_tools: d.current_tools || null,
      challenge: d.challenge || null,
    })
    .select("id")
    .maybeSingle();

  if (leadError) return json({ error: "Could not save your details." }, 500);

  await admin
    .from("lead_magnets")
    .update({ download_count: (magnet.download_count ?? 0) + 1 })
    .eq("id", magnet.id);

  // Build the download link: signed URL for uploaded files, otherwise the
  // readable article page.
  let downloadUrl = `${SITE}/lead-magnet/${magnet.slug}/read`;
  if (magnet.file_url) {
    if (/^https?:\/\//i.test(magnet.file_url)) {
      downloadUrl = magnet.file_url;
    } else {
      const { data: signed } = await admin.storage
        .from("lead-magnets")
        .createSignedUrl(magnet.file_url, SIGNED_URL_SECONDS);
      if (signed?.signedUrl) downloadUrl = signed.signedUrl;
    }
  }

  if (apiKey) {
    const send = (to: string, subject: string, html: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: SENDER, to: [to], reply_to: TEAM_INBOX, subject, html }),
      })
        .then((r) => r.ok)
        .catch(() => false);

    const ok = await send(
      d.email,
      `Your ${magnet.title} – Download Link`,
      confirmationEmailHtml({ name: d.full_name, title: magnet.title, downloadUrl })
    );

    await admin.from("lead_magnet_followups").insert({
      lead_id: lead!.id,
      email_type: "confirmation",
      scheduled_for: new Date().toISOString(),
      sent_at: ok ? new Date().toISOString() : null,
      error: ok ? null : "Send failed",
    });

    // Team notification (best effort)
    await send(
      TEAM_INBOX,
      `New lead magnet download — ${magnet.title}`,
      `<div style="font-family:Arial,Helvetica,sans-serif;color:#374151;">
        <p><strong>${esc(d.full_name)}</strong> (${esc(d.email)}) downloaded <strong>${esc(magnet.title)}</strong>.</p>
        <p>Tournament: ${esc(d.tournament_name || "—")}<br/>Date: ${esc(d.tournament_date || "—")}<br/>Players: ${esc(d.expected_players ?? "—")}<br/>Challenge: ${esc(d.challenge || "—")}</p>
        <p>Open Admin Dashboard → Lead Magnets → Leads to follow up.</p>
      </div>`
    );
  }

  // Schedule the 3-day sample offer reminder.
  const later = new Date();
  later.setDate(later.getDate() + 3);
  await admin.from("lead_magnet_followups").insert({
    lead_id: lead!.id,
    email_type: "sample_offer",
    scheduled_for: later.toISOString(),
  });

  return json({ ok: true, download_url: downloadUrl, lead_id: lead?.id ?? null });
}

export const Route = createFileRoute("/api/public/lead-magnet-download")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      POST: ({ request }) => handle(request),
    },
  },
});

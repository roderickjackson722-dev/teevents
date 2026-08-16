// Receives "Request a Sample" qualification form submissions from the public
// site, stores them, and emails the TeeVents team plus a confirmation to the
// prospect. Public endpoint — validate everything here.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const TEAM_INBOX = "info@teevents.golf";

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

const schema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organization_name: z.string().trim().max(160).optional().or(z.literal("")),
  tournament_name: z.string().trim().min(1).max(200),
  tournament_date: z.string().trim().max(20).optional().or(z.literal("")),
  expected_players: z.number().int().min(0).max(100000).nullable().optional(),
  current_tools: z.string().trim().max(200).optional().or(z.literal("")),
  challenge: z.string().trim().max(2000).optional().or(z.literal("")),
  flyer_url: z.string().trim().max(500).optional().or(z.literal("")),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
});

async function handle(request: Request) {
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  const apiKey = process.env["RESEND_API_KEY"];

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "Please check the form and try again." }, 400);
  }
  const d = parsed.data;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: row, error } = await admin
    .from("sample_requests")
    .insert({
      full_name: d.full_name,
      email: d.email,
      phone: d.phone || null,
      organization_name: d.organization_name || null,
      tournament_name: d.tournament_name,
      tournament_date: d.tournament_date || null,
      expected_players: d.expected_players ?? null,
      current_tools: d.current_tools || null,
      challenge: d.challenge || null,
      flyer_url: d.flyer_url || null,
      logo_url: d.logo_url || null,
    })
    .select("id")
    .maybeSingle();

  if (error) return json({ error: "Could not save your request." }, 500);

  if (apiKey) {
    const rows = [
      ["Name", d.full_name],
      ["Email", d.email],
      ["Phone", d.phone],
      ["Organization", d.organization_name],
      ["Tournament", d.tournament_name],
      ["Event date", d.tournament_date],
      ["Expected players", d.expected_players ?? ""],
      ["Currently using", d.current_tools],
      ["Biggest challenge", d.challenge],
      ["Flyer uploaded", d.flyer_url ? "Yes" : "No"],
      ["Logo uploaded", d.logo_url ? "Yes" : "No"],
    ]
      .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px;color:#6b7280;">${esc(k)}</td><td style="padding:6px 12px;"><strong>${esc(v)}</strong></td></tr>`
      )
      .join("");

    const send = (to: string, subject: string, html: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: SENDER, to: [to], reply_to: TEAM_INBOX, subject, html }),
      }).catch(() => null);

    await Promise.all([
      send(
        TEAM_INBOX,
        `New Sample Request — ${d.tournament_name}`,
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#374151;">
          <div style="background:#1a5c38;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:19px;">New Sample Request</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:18px 10px;border-radius:0 0 8px 8px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
            <p style="font-size:13px;color:#6b7280;padding:0 12px;">Open Admin Dashboard → Sample Requests to build the sample.</p>
          </div>
        </div>`
      ),
      send(
        d.email,
        "We're building your TeeVents sample",
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#374151;">
          <div style="background:#1a5c38;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:20px;">Your Sample Is On The Way</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <p>Hi ${esc(d.full_name)},</p>
            <p>Thanks for requesting a sample for <strong>${esc(d.tournament_name)}</strong>. Our team is putting together a personalized organizer dashboard and public event page using your details.</p>
            <p>You'll hear from us within one business day with your private sample link.</p>
            <p style="margin:24px 0;">
              <a href="https://www.teevents.golf/plans" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">See Plans &amp; Pricing</a>
            </p>
            <p style="margin-top:24px;">Best,<br/>TeeVents Golf Management</p>
          </div>
        </div>`
      ),
    ]);
  }

  return json({ ok: true, id: row?.id ?? null });
}

export const Route = createFileRoute("/api/public/sample-request")({
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

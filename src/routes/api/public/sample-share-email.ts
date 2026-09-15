// Sends the sample event page email to a prospect from the admin Demo Converter.
// The admin edits the subject and message in the UI first, so this route only
// wraps the approved text in the TeeVents branded template and sends it.
// Platform admins only.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildSampleShareEmailHtml } from "@/lib/sampleShareEmail";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";

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

  const { data: adminRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole) return json({ error: "Forbidden" }, 403);

  const body = (await request.json().catch(() => ({}))) as {
    sample_id?: string;
    to?: string;
    subject?: string;
    heading?: string;
    message?: string;
    button_label?: string;
    link?: string;
  };

  if (!body.to || !body.subject || !body.message || !body.link) {
    return json({ error: "to, subject, message and link are required" }, 400);
  }

  let logoUrl: string | null = null;
  let primaryColor: string | null = null;
  let secondaryColor: string | null = null;
  if (body.sample_id) {
    const { data: sample } = await admin
      .from("sample_tournaments")
      .select("logo_url, primary_color, secondary_color")
      .eq("id", body.sample_id)
      .maybeSingle();
    logoUrl = (sample as any)?.logo_url ?? null;
    primaryColor = (sample as any)?.primary_color ?? null;
    secondaryColor = (sample as any)?.secondary_color ?? null;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: SENDER,
      to: [body.to],
      reply_to: "info@teevents.golf",
      subject: body.subject,
      html: buildSampleShareEmailHtml({
        heading: body.heading || body.subject,
        message: body.message,
        link: body.link,
        buttonLabel: body.button_label,
        logoUrl,
        primaryColor,
        secondaryColor,
      }),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "Send failed", detail }, 502);
  }

  if (body.sample_id) {
    await admin
      .from("sample_tournaments")
      .update({ shared_at: new Date().toISOString() } as never)
      .eq("id", body.sample_id);
  }

  return json({ ok: true });
}

export const Route = createFileRoute("/api/public/sample-share-email")({
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

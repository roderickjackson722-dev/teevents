// Sends an organizer-authored payment receipt email to a single recipient.
// The organizer edits and previews the receipt in Email Templates first, so this
// route only verifies the caller owns the event and hands the HTML to Resend.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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

  const body = (await request.json().catch(() => ({}))) as {
    tournament_id?: string;
    to?: string;
    subject?: string;
    html?: string;
  };

  if (!body.tournament_id || !body.to || !body.html) {
    return json({ error: "tournament_id, to and html are required" }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.to.trim())) {
    return json({ error: "Invalid recipient email" }, 400);
  }

  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, organization_id")
    .eq("id", body.tournament_id)
    .maybeSingle();
  if (!tournament) return json({ error: "Event not found" }, 404);

  // Authorized when the caller is a platform admin or a member of the owning org.
  const { data: adminRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();

  let allowed = !!adminRole;
  if (!allowed) {
    const { data: isMember } = await admin.rpc("is_org_member", {
      _user_id: caller.id,
      _org_id: (tournament as any).organization_id,
    } as never);
    allowed = !!isMember;
  }
  if (!allowed) return json({ error: "Forbidden" }, 403);

  // The recipient must be someone already on file for this event (or the caller).
  const to = body.to.trim().toLowerCase();
  let onFile = to === String(caller.email || "").toLowerCase();
  if (!onFile) {
    const [{ data: regs }, { data: txs }, { data: sps }] = await Promise.all([
      admin.from("tournament_registrations").select("id").eq("tournament_id", body.tournament_id).ilike("email", to).limit(1),
      admin.from("platform_transactions").select("id").eq("tournament_id", body.tournament_id).ilike("golfer_email", to).limit(1),
      admin.from("sponsor_registrations").select("id").eq("tournament_id", body.tournament_id).ilike("contact_email", to).limit(1),
    ]);
    onFile = !!(regs?.length || txs?.length || sps?.length);
  }
  if (!onFile) return json({ error: "Recipient must be a registrant, payer or sponsor of this event" }, 403);

  const safeHtml = String(body.html)
    .slice(0, 200_000)
    .replace(/<\s*(script|iframe|object|embed|form|input|button|textarea|select|meta|link|base)\b[\s\S]*?(<\s*\/\s*\1\s*>|\/?>)/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"');

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: SENDER,
      to: [body.to.trim()],
      reply_to: "info@teevents.golf",
      subject: String(body.subject || "Your receipt").replace(/[\r\n]+/g, " ").slice(0, 200),
      html: safeHtml,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("receipt-email send failed", detail);
    return json({ error: "Send failed" }, 502);
  }

  return json({ ok: true });
}

export const Route = createFileRoute("/api/public/receipt-email")({
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

// deno-lint-ignore-file no-explicit-any
// Admin-only: grant a prospect time-limited, view-only access to a demo dashboard.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing auth" });

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json(403, { error: "Forbidden" });

    const body = await req.json().catch(() => ({} as any));
    const tournamentId = (body?.tournament_id || "").trim();
    const email = (body?.prospect_email || "").trim().toLowerCase();
    const rawPhone = (body?.prospect_phone || "").trim();
    const digits = rawPhone.replace(/[^0-9]/g, "");
    const phoneE164 = digits ? (digits.length === 10 ? `+1${digits}` : `+${digits}`) : "";
    const name = (body?.prospect_name || "").trim() || null;
    const days = [7, 14, 30].includes(Number(body?.days)) ? Number(body.days) : 7;
    const sendEmail = body?.send_email !== false && !!email;
    const sendSms = body?.send_sms === true && !!phoneE164;

    if (!tournamentId) return json(400, { error: "tournament_id required" });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json(400, { error: "Valid prospect_email required" });
    }
    if (!email && digits.length < 10) {
      return json(400, { error: "Provide a valid email address or mobile number" });
    }

    const { data: tournament, error: tErr } = await admin
      .from("tournaments")
      .select("id, title, organization_id, is_demo")
      .eq("id", tournamentId)
      .maybeSingle();
    if (tErr) return json(500, { error: tErr.message });
    if (!tournament) return json(404, { error: "Tournament not found" });

    const accessToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: row, error: iErr } = await admin
      .from("demo_access")
      .insert({
        tournament_id: tournament.id,
        prospect_email: email || null,
        prospect_phone: phoneE164 || null,
        delivery_method: email && phoneE164 ? "both" : email ? "email" : "sms",
        prospect_name: name,
        access_token: accessToken,
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (iErr) return json(500, { error: iErr.message });

    const origin = (body?.origin || "https://www.teevents.golf").replace(/\/$/, "");
    const identifier = email || phoneE164;
    const link = `${origin}/sample/access/${accessToken}?email=${encodeURIComponent(identifier)}`;

    let emailed = false;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (sendEmail && RESEND_API_KEY) {
      const html = `
        <p>Hi ${name || "there"},</p>
        <p>You have been granted access to view a sample dashboard for <strong>${tournament.title}</strong>.</p>
        <p>Click the link below to enter your email and start exploring:</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#F5A623;color:#1a5c38;font-weight:700;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block">View Sample Dashboard</a>
        </p>
        <p>This link expires in ${days} days. No login required &mdash; just enter your email address.</p>
        <p style="margin-top:24px">Best,<br/>Rod Jackson<br/>TeeVents Golf Management</p>
      `;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to: email,
          subject: `Your Sample Tournament Dashboard – ${tournament.title}`,
          html,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.warn("[demo-access-grant] email failed", await res.text());
    }

    return json(200, { ok: true, access: row, link, emailed });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});

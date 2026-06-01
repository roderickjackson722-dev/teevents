// Sends each registered player their personalized Day-of Event Page link by email.
// Supports two modes: { test_email } sends a single test, otherwise sends to all
// registered players for the tournament. Auth: tournament must belong to caller's org
// (or caller must be admin).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const BASE_URL = "https://www.teevents.golf";

interface Body {
  tournament_id: string;
  test_email?: string;        // if provided, sends a single test using DEMO code
  registration_id?: string;   // if provided, sends to that single registrant with their real code
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as Body;
    const { tournament_id, test_email, registration_id } = body;
    if (!tournament_id) {
      return new Response(JSON.stringify({ error: "Missing tournament_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load tournament
    const { data: t, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, date, organization_id, day_of_director_name")
      .eq("id", tournament_id)
      .maybeSingle();
    if (tErr || !t) {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authz
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    let allowed = !!isAdmin;
    if (!allowed) {
      const { data: isMember } = await supabaseAdmin.rpc("is_org_member", {
        _user_id: user.id, _org_id: t.organization_id,
      });
      allowed = !!isMember;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const eventDate = t.date
      ? new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : "your tournament day";
    const directorName = t.day_of_director_name || "Your Tournament Organizer";

    const buildHtml = (firstName: string, link: string) => `
<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;padding:24px;color:#1f2937;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;overflow:hidden;">
    <tr><td style="padding:24px;line-height:1.6;">
      <h2 style="margin:0 0 12px;color:#1a5c38;">${escapeHtml(t.title)} – Your Day-of Event Page</h2>
      <p>Hello ${escapeHtml(firstName || "Player")},</p>
      <p>Your tournament day is almost here! Use the link below to access your personalized day-of page on <strong>${escapeHtml(eventDate)}</strong>.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#F5A623;color:#1a5c38;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Open My Day-of Page</a>
      </p>
      <p>On this page you can:</p>
      <ul>
        <li>See your tee time and starting hole</li>
        <li>Enter your live scores</li>
        <li>Follow the leaderboard</li>
        <li>View announcements and sponsor messages</li>
      </ul>
      <p>No login required — just tap the link.</p>
      <p>Best of luck,<br/>${escapeHtml(directorName)}</p>
      <p style="font-size:11px;color:#9ca3af;word-break:break-all;">If the button doesn't work, copy this link: ${link}</p>
    </td></tr>
  </table>
</body></html>`;

    const subject = `${t.title} – Your Day-of Event Page`;

    // Test mode
    if (test_email) {
      const link = `${BASE_URL}/day-of/${t.slug}/DEMO`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [test_email],
          subject: `[TEST] ${subject}`,
          html: buildHtml("Sample Player", link),
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Resend test failed (${r.status}): ${txt}`);
      }
      return new Response(JSON.stringify({ sent: 1, test: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk to all registered players with an email
    const { data: regs, error: rErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, first_name, email, scoring_code")
      .eq("tournament_id", tournament_id);
    if (rErr) throw rErr;

    const recipients = (regs || []).filter((r: any) => r.email && r.scoring_code);
    let sent = 0;
    const errors: string[] = [];

    // Send in small batches to avoid bursts
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i] as any;
      const link = `${BASE_URL}/day-of/${t.slug}/${r.scoring_code}`;
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [r.email],
            subject,
            html: buildHtml(r.first_name || "Player", link),
          }),
        });
        if (resp.ok) sent++;
        else errors.push(`${r.email}: ${resp.status}`);
      } catch (e) {
        errors.push(`${r.email}: ${(e as Error).message}`);
      }
      // Throttle ~5/sec
      if ((i + 1) % 5 === 0) await new Promise((res) => setTimeout(res, 1100));
    }

    return new Response(JSON.stringify({ sent, total: recipients.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

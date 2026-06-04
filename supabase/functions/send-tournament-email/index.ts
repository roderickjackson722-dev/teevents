// Sends a one-time email from the organizer to selected (or all) registered players
// of a tournament. Auth: caller must be a member of the tournament's organization
// (or an admin). Logs every send to public.day_of_emails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

interface Body {
  tournament_id: string;
  recipient_ids?: string[]; // registration ids; if omitted -> send to all
  subject?: string;
  message?: string; // plain or basic HTML
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
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
    const { tournament_id, recipient_ids, subject: rawSubject, message: rawMessage } = body;
    if (!tournament_id) {
      return new Response(JSON.stringify({ error: "Missing tournament_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id, day_of_director_name")
      .eq("id", tournament_id)
      .maybeSingle();
    if (!t) {
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

    // Rate limit: max 100 emails / hour / tournament
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("day_of_emails")
      .select("recipient_count")
      .eq("tournament_id", tournament_id)
      .gte("sent_at", oneHourAgo);
    const recentTotal = (recent || []).reduce((s, r: any) => s + (r.recipient_count || 0), 0);

    // Load recipients
    let regQuery = supabaseAdmin
      .from("tournament_registrations")
      .select("id, first_name, last_name, email")
      .eq("tournament_id", tournament_id);
    if (Array.isArray(recipient_ids) && recipient_ids.length) {
      regQuery = regQuery.in("id", recipient_ids);
    }
    const { data: regs } = await regQuery;
    const recipients = (regs || []).filter((r: any) => r.email);

    if (recentTotal + recipients.length > 100) {
      return new Response(JSON.stringify({
        error: `Rate limit: you can send at most 100 emails per hour per tournament. ${100 - recentTotal} remaining.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!recipients.length) {
      return new Response(JSON.stringify({ error: "No recipients with an email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const subject = (rawSubject && rawSubject.trim()) || `${t.title} – Important Update`;
    const customMsg = (rawMessage && rawMessage.trim()) || "";
    const directorName = t.day_of_director_name || `The ${t.title} Team`;

    const buildHtml = (firstName: string) => `
<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;padding:24px;color:#1f2937;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;overflow:hidden;">
    <tr><td style="padding:24px;line-height:1.6;">
      <h2 style="margin:0 0 12px;color:#1a5c38;">${escapeHtml(t.title)}</h2>
      <p>Hello ${escapeHtml(firstName || "Player")},</p>
      <p>This is a message from the tournament organizer regarding <strong>${escapeHtml(t.title)}</strong>.</p>
      <div style="white-space:pre-wrap;border-left:3px solid #F5A623;padding:8px 12px;background:#fff8eb;margin:16px 0;">${escapeHtml(customMsg) || "(no additional details)"}</div>
      <p>Thank you,<br/>${escapeHtml(directorName)}</p>
    </td></tr>
  </table>
</body></html>`;

    let sent = 0;
    const errors: string[] = [];
    for (const r of recipients as any[]) {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [r.email],
            subject,
            html: buildHtml(r.first_name || "Player"),
          }),
        });
        if (resp.ok) sent++;
        else errors.push(`${r.email}: ${resp.status}`);
      } catch (e) {
        errors.push(`${r.email}: ${(e as Error).message}`);
      }
    }

    // Log
    await supabaseAdmin.from("day_of_emails").insert({
      tournament_id,
      sent_by: user.id,
      recipient_count: sent,
      subject,
      message: customMsg,
    });

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Sends a welcome email to a newly-signed-up organizer (free OR paid),
// with an optional white-glove setup-service offer driven by platform_settings.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "TeeVents <info@notifications.teevents.golf>";
const DASHBOARD_URL = "https://www.teevents.golf/dashboard";

const DEFAULT_SUBJECT = "Welcome to TeeVents – Let's get your tournament started!";
const DEFAULT_HTML = `<p>Hi {{name}},</p>
<p>I'm Rod, the founder of TeeVents. I'm here to make sure you get the most out of the platform.</p>
<p>{{tournament_block}}</p>
<p>Here's where to start:</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{dashboard_url}}" style="background:#F5A623;color:#1a5c38;font-weight:700;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block">Open Your Dashboard</a>
</p>
<p>If you need help with anything – setting up your event, adding players, or configuring payments – just reply to this email. I'm happy to help.</p>
{{setup_offer}}
<p style="margin-top:24px">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>`;

function renderTokens(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, plan, tournament_name } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await admin
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "welcome_email_enabled",
        "welcome_email_include_setup_offer",
        "welcome_setup_fee_dollars",
        "welcome_email_subject",
        "welcome_email_html",
      ]);
    const settings: Record<string, unknown> = {};
    for (const r of rows || []) settings[(r as any).key] = (r as any).value;

    const enabled = settings.welcome_email_enabled !== false;
    if (!enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const includeOffer = settings.welcome_email_include_setup_offer !== false;
    const setupFee = Number(settings.welcome_setup_fee_dollars ?? 199) || 199;
    const subjectTpl = (settings.welcome_email_subject as string) || DEFAULT_SUBJECT;
    const htmlTpl = (settings.welcome_email_html as string) || DEFAULT_HTML;

    const name = (full_name && String(full_name).trim()) || "there";

    const setupOfferHtml = includeOffer ? `
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
<h3 style="color:#1a5c38;margin:0 0 8px">🔥 Want me to build your tournament for you?</h3>
<p>I understand that not everyone has the time to set everything up themselves. If you'd like, I can handle the entire setup for you:</p>
<ul>
  <li>Complete tournament setup (website, registration, payments)</li>
  <li>Custom branding and design</li>
  <li>Player and sponsor data migration</li>
  <li>Full testing before your event</li>
  <li>One-on-one walkthrough</li>
</ul>
<p><strong>Price:</strong> $${setupFee} (one-time)</p>
<p>If you're interested, just reply "Yes" and I'll send over the details.</p>
<p>No pressure – either way, I'm here to help!</p>` : "";

    const tournamentBlock = tournament_name
      ? `Your tournament <strong>${tournament_name}</strong> is ready to go.`
      : "Your account is ready to go.";

    const vars = {
      name,
      plan: String(plan || "Base"),
      tournament_name: String(tournament_name || ""),
      tournament_block: tournamentBlock,
      dashboard_url: DASHBOARD_URL,
      setup_offer: setupOfferHtml,
    };

    const subject = renderTokens(subjectTpl, vars);
    const bodyHtml = renderTokens(htmlTpl, vars);

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.6;padding:20px">${bodyHtml}</div>`;
    const text = bodyHtml.replace(/<[^>]+>/g, "").replace(/\n\s*\n/g, "\n\n");

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject,
        html, text,
        reply_to: "info@teevents.golf",
      }),
    });
    const result = await r.json();

    // Admin notification
    const adminHtml = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.55">
  <h2 style="color:#1a5c38;margin:0 0 8px">New Organizer Signup</h2>
  <p>A new organizer has signed up for TeeVents.</p>
  <table style="width:100%;border-collapse:collapse;margin:8px 0">
    <tr><td style="padding:6px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;width:35%">Organizer</td><td style="padding:6px;border:1px solid #e5e7eb">${name}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold">Email</td><td style="padding:6px;border:1px solid #e5e7eb">${email}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold">Plan</td><td style="padding:6px;border:1px solid #e5e7eb">${plan || "Base"}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold">Tournament</td><td style="padding:6px;border:1px solid #e5e7eb">${tournament_name || "—"}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold">Date</td><td style="padding:6px;border:1px solid #e5e7eb">${new Date().toLocaleString("en-US")}</td></tr>
  </table>
  <p>🔗 <a href="https://www.teevents.golf/admin">View in Admin Dashboard</a></p>
</div>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: ["info@teevents.golf"],
        subject: `🆕 New Organizer Signup – ${name === "there" ? email : name}`,
        html: adminHtml,
      }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

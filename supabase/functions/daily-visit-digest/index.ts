import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTIFY_EMAIL = "info@teevents.golf";
const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Analytics";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get the most recent visit (called right after insert from track-visit)
    const body = await req.json().catch(() => ({}));
    const visit = body.visit;

    if (!visit) {
      return new Response(JSON.stringify({ error: "No visit data" }), { status: 400 });
    }

    // Parse useful info
    let pagePath = visit.page_url;
    try { pagePath = new URL(visit.page_url).pathname; } catch {}

    let referrerDisplay = visit.referrer || "Direct";
    if (!referrerDisplay || referrerDisplay === "Direct / No referrer") {
      referrerDisplay = "Direct / Typed URL";
    } else {
      try { referrerDisplay = new URL(referrerDisplay).hostname; } catch {}
    }

    const location = [visit.city, visit.country].filter(Boolean).join(", ") || "Unknown";
    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });

    // Parse user agent for device/browser info
    const ua = visit.user_agent || "Unknown";
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const deviceType = isMobile ? "📱 Mobile" : "💻 Desktop";

    let browser = "Unknown";
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Edg/i.test(ua)) browser = "Edge";

    let os = "Unknown";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac OS/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad/i.test(ua)) os = "iOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    // Get today's visit count for context
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    const visitCount = count || 0;

    const html = buildVisitEmail({
      pagePath,
      fullUrl: visit.page_url,
      referrer: referrerDisplay,
      rawReferrer: visit.referrer,
      location,
      ip: visit.ip_address || "Unknown",
      deviceType,
      browser,
      os,
      timestamp,
      visitCount,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [NOTIFY_EMAIL],
        subject: `🔔 New Visitor — ${pagePath} from ${location} (#${visitCount} today)`,
        html,
      }),
    });

    const resBody = await res.text();
    console.log(`Resend response (${res.status}):`, resBody);
    if (!res.ok) {
      console.error(`Resend error (${res.status}):`, resBody);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("visit-notify error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface VisitData {
  pagePath: string;
  fullUrl: string;
  referrer: string;
  rawReferrer: string;
  location: string;
  ip: string;
  deviceType: string;
  browser: string;
  os: string;
  timestamp: string;
  visitCount: number;
}

function buildVisitEmail(v: VisitData) {
  const row = (icon: string, label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:140px;white-space:nowrap;">${icon} ${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <tr><td style="background:#1a5c38;padding:20px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:17px;font-weight:600;">🔔 New Website Visitor</h1>
          <p style="margin:4px 0 0;color:#ffffff;opacity:0.8;font-size:13px;">${v.timestamp} ET</p>
        </td></tr>

        <!-- Visit count badge -->
        <tr><td style="padding:16px 24px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#f0fdf4;border-radius:20px;padding:6px 14px;">
              <span style="color:#1a5c38;font-size:13px;font-weight:600;">Visitor #${v.visitCount} today</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:16px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            ${row("📄", "Page Visited", `<a href="${v.fullUrl}" style="color:#1a5c38;text-decoration:none;">${v.pagePath}</a>`)}
            ${row("📍", "Location", v.location)}
            ${row("🔗", "Lead Source", v.referrer)}
            ${v.rawReferrer && v.rawReferrer !== "Direct / No referrer" && v.rawReferrer !== "" ? row("🌐", "Full Referrer", `<span style="font-size:12px;color:#6b7280;word-break:break-all;">${v.rawReferrer}</span>`) : ""}
            ${row("🖥️", "Device", v.deviceType)}
            ${row("🌍", "Browser", `${v.browser} on ${v.os}`)}
            ${row("📡", "IP Address", v.ip)}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">TeeVents Analytics • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

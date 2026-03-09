import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTIFY_EMAIL = "info@teevents.golf";
const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Analytics";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page_url, referrer, user_agent } = await req.json();

    // Get visitor IP from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || "unknown";

    // Lookup IP geolocation using free ip-api.com
    let city = null;
    let region = null;
    let country = null;
    let isp = null;
    let locationDisplay = "Unknown location";

    if (ip && ip !== "unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === "success") {
            city = geo.city || null;
            region = geo.regionName || null;
            country = geo.country || null;
            isp = geo.isp || null;
            const parts = [city, region, country].filter(Boolean);
            locationDisplay = parts.length > 0 ? parts.join(", ") : "Unknown location";
          }
        }
      } catch (e) {
        console.warn("Geo lookup failed:", e);
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert visit record with location data
    const { error: insertError } = await supabaseAdmin
      .from("site_visits")
      .insert({
        page_url: page_url || "unknown",
        referrer: referrer || "Direct / No referrer",
        user_agent: user_agent || null,
        ip_address: ip,
        city: city,
        country: country,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // Get visit count for context
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabaseAdmin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00.000Z`);

    // Parse referrer for cleaner display
    let referrerDisplay = referrer || "Direct / No referrer";
    try {
      if (referrer && referrer !== "" && !referrer.startsWith("about:")) {
        const url = new URL(referrer);
        referrerDisplay = url.hostname + (url.pathname !== "/" ? url.pathname : "");
      }
    } catch {
      // keep raw referrer
    }

    // Send notification email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const now = new Date();
      const timeStr = now.toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a5c38;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">🌐 New Website Visitor</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Someone just visited your website.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:120px;">📍 Location</td>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${locationDisplay}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">🌐 IP Address</td>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${ip}</td>
            </tr>${isp ? `
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">📡 ISP</td>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${isp}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">📄 Page</td>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${page_url || "/"}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">🔗 Came From</td>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${referrerDisplay}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6b7280;font-size:13px;">🕐 Time</td>
              <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:500;">${timeStr} ET</td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">
            📊 <strong>${count || 1}</strong> total visit${(count || 1) > 1 ? "s" : ""} today
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">TeeVents Analytics • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [NOTIFY_EMAIL],
          subject: `🌐 Visitor from ${locationDisplay} — ${page_url || "/"}`,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`Resend error (${res.status}):`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-visit error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

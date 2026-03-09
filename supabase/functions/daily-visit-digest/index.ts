import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTIFY_EMAIL = "info@teevents.golf";
const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Analytics";

Deno.serve(async (req) => {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get yesterday's date range
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1).toISOString();

    const dateLabel = yesterday.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    // Fetch yesterday's visits
    const { data: visits, error } = await supabaseAdmin
      .from("site_visits")
      .select("*")
      .gte("created_at", startOfYesterday)
      .lt("created_at", endOfYesterday)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const totalVisits = visits?.length || 0;

    // If no visits, send a short summary
    if (totalVisits === 0) {
      const html = buildEmail(dateLabel, 0, 0, [], [], [], []);
      await sendEmail(RESEND_API_KEY, dateLabel, html, 0);
      return new Response(JSON.stringify({ ok: true, visits: 0 }));
    }

    // Unique visitors by IP
    const uniqueIPs = new Set(visits!.map(v => v.ip_address).filter(Boolean)).size;

    // Top pages
    const pageMap: Record<string, number> = {};
    visits!.forEach(v => {
      try {
        const path = new URL(v.page_url).pathname;
        pageMap[path] = (pageMap[path] || 0) + 1;
      } catch {
        pageMap[v.page_url] = (pageMap[v.page_url] || 0) + 1;
      }
    });
    const topPages = Object.entries(pageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Top referrers
    const refMap: Record<string, number> = {};
    visits!.forEach(v => {
      let ref = v.referrer || "Direct";
      if (ref === "" || ref === "Direct / No referrer") ref = "Direct";
      else { try { ref = new URL(ref).hostname; } catch {} }
      refMap[ref] = (refMap[ref] || 0) + 1;
    });
    const topReferrers = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Top locations
    const locMap: Record<string, number> = {};
    visits!.forEach(v => {
      const loc = [v.city, v.country].filter(Boolean).join(", ") || "Unknown";
      locMap[loc] = (locMap[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Hourly breakdown
    const hourMap: Record<number, number> = {};
    visits!.forEach(v => {
      const h = new Date(v.created_at).getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    const peakHourLabel = peakHour
      ? `${parseInt(peakHour[0]) % 12 || 12}${parseInt(peakHour[0]) >= 12 ? "pm" : "am"} (${peakHour[1]} visits)`
      : "N/A";

    const html = buildEmail(dateLabel, totalVisits, uniqueIPs, topPages, topReferrers, topLocations, visits!.slice(0, 10), peakHourLabel);
    await sendEmail(RESEND_API_KEY, dateLabel, html, totalVisits);

    return new Response(JSON.stringify({ ok: true, visits: totalVisits }));
  } catch (err) {
    console.error("daily-digest error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});

async function sendEmail(apiKey: string, dateLabel: string, html: string, totalVisits: number) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [NOTIFY_EMAIL],
      subject: `📊 Daily Digest: ${totalVisits} visit${totalVisits !== 1 ? "s" : ""} — ${dateLabel}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error (${res.status}):`, err);
  }
}

function buildEmail(
  dateLabel: string,
  totalVisits: number,
  uniqueIPs: number,
  topPages: [string, number][],
  topReferrers: [string, number][],
  topLocations: [string, number][],
  recentVisits: any[],
  peakHour?: string,
) {
  const tableRow = (label: string, value: string | number) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:140px;">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  const rankedList = (items: [string, number][], emoji: string) => {
    if (items.length === 0) return `<p style="color:#9ca3af;font-size:13px;">No data</p>`;
    return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      ${items.map(([name, count], i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;width:28px;">${i + 1}.</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;">${emoji} ${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1a5c38;font-size:13px;font-weight:600;text-align:right;width:50px;">${count}</td>
        </tr>`).join("")}
    </table>`;
  };

  const recentTable = recentVisits.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;font-size:12px;">
      <tr style="background:#e5e7eb;">
        <td style="padding:8px 10px;font-weight:600;color:#374151;">Time</td>
        <td style="padding:8px 10px;font-weight:600;color:#374151;">Page</td>
        <td style="padding:8px 10px;font-weight:600;color:#374151;">Location</td>
        <td style="padding:8px 10px;font-weight:600;color:#374151;">Source</td>
      </tr>
      ${recentVisits.map(v => {
        let page = v.page_url;
        try { page = new URL(v.page_url).pathname; } catch {}
        let ref = v.referrer || "Direct";
        if (ref === "" || ref === "Direct / No referrer") ref = "Direct";
        else { try { ref = new URL(ref).hostname; } catch {} }
        const loc = [v.city, v.country].filter(Boolean).join(", ") || "—";
        const time = new Date(v.created_at).toLocaleString("en-US", {
          hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York",
        });
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${time}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#111827;font-family:monospace;">${page}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${loc}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${ref}</td>
        </tr>`;
      }).join("")}
    </table>` : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="background:#1a5c38;padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">📊 Daily Traffic Digest</h1>
          <p style="margin:6px 0 0;color:#ffffff;opacity:0.8;font-size:14px;">${dateLabel}</p>
        </td></tr>

        <!-- Summary Stats -->
        <tr><td style="padding:28px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;width:33%;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#1a5c38;">${totalVisits}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Total Visits</p>
              </td>
              <td style="width:12px;"></td>
              <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;width:33%;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#1a5c38;">${uniqueIPs}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Unique Visitors</p>
              </td>
              <td style="width:12px;"></td>
              <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;width:33%;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#1a5c38;">${peakHour || "N/A"}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Peak Hour</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Top Pages -->
        <tr><td style="padding:24px 32px 0;">
          <h2 style="margin:0 0 12px;font-size:15px;color:#374151;">📄 Top Pages</h2>
          ${rankedList(topPages, "")}
        </td></tr>

        <!-- Traffic Sources -->
        <tr><td style="padding:24px 32px 0;">
          <h2 style="margin:0 0 12px;font-size:15px;color:#374151;">🔗 Traffic Sources</h2>
          ${rankedList(topReferrers, "")}
        </td></tr>

        <!-- Visitor Locations -->
        <tr><td style="padding:24px 32px 0;">
          <h2 style="margin:0 0 12px;font-size:15px;color:#374151;">📍 Visitor Locations</h2>
          ${rankedList(topLocations, "")}
        </td></tr>

        <!-- Recent Visits -->
        ${recentTable ? `
        <tr><td style="padding:24px 32px 0;">
          <h2 style="margin:0 0 12px;font-size:15px;color:#374151;">🕐 Recent Visits</h2>
          ${recentTable}
        </td></tr>` : ""}

        <!-- Footer -->
        <tr><td style="padding:24px 32px;margin-top:16px;">
          <table width="100%" style="border-top:1px solid #e5e7eb;padding-top:16px;">
            <tr><td>
              <p style="margin:0;color:#9ca3af;font-size:12px;">TeeVents Analytics • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

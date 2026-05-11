import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANUAL_KEYWORDS = ["venmo", "cash app", "cashapp", "zelle", "paypal", "check", "cash only", "mail a check", "money order"];

function pick(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1].trim().replace(/\s+/g, " ") : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

async function scrape(url: string) {
  const out: any = { source_url: url, source: "manual", detected_setup: "unknown", extracted_data: {} };
  try {
    const u = new URL(url);
    if (u.hostname.includes("eventbrite")) {
      out.source = "eventbrite";
      out.detected_setup = "eventbrite";
    } else if (u.hostname.includes("facebook")) {
      out.source = "facebook";
      out.detected_setup = "facebook";
    }

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) {
      out.error = `HTTP ${resp.status}`;
      return out;
    }
    const html = await resp.text();
    let description = "";

    // JSON-LD
    const ldMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of ldMatches) {
      try {
        const data = JSON.parse(m[1].trim());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "Event" || (Array.isArray(item["@type"]) && item["@type"].includes("Event"))) {
            out.tournament_name = item.name || out.tournament_name;
            if (item.startDate) out.event_date = String(item.startDate).slice(0, 10);
            if (item.description) description += " " + String(item.description);
            if (item.location) {
              const loc = item.location;
              if (typeof loc === "string") out.location = loc;
              else if (loc.name || loc.address) {
                const addr = loc.address;
                const addrStr = typeof addr === "string" ? addr : addr ? [addr.streetAddress, addr.addressLocality, addr.addressRegion].filter(Boolean).join(", ") : "";
                out.location = [loc.name, addrStr].filter(Boolean).join(" — ");
              }
            }
            if (item.organizer) {
              out.organizer_name = typeof item.organizer === "string" ? item.organizer : item.organizer.name;
              if (item.organizer.email) out.contact_email = item.organizer.email;
            }
            out.extracted_data.jsonld = item;
          }
        }
      } catch { /* ignore */ }
    }

    // Fallbacks via meta tags
    if (!out.tournament_name) {
      out.tournament_name = pick(html, /<meta\s+property="og:title"\s+content="([^"]+)"/i) || pick(html, /<title[^>]*>([^<]+)<\/title>/i);
      if (out.tournament_name) out.tournament_name = decodeHtml(out.tournament_name);
    }
    const ogDesc = pick(html, /<meta\s+property="og:description"\s+content="([^"]+)"/i) || pick(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
    if (ogDesc) description += " " + decodeHtml(ogDesc);

    // Add a chunk of body text for keyword scanning
    const bodyText = stripTags(html).toLowerCase();
    description = (description + " " + bodyText).toLowerCase();

    // Email scrape
    if (!out.contact_email) {
      const em = html.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (em && !em[0].includes("eventbrite") && !em[0].includes("facebook") && !em[0].includes("sentry")) {
        out.contact_email = em[0];
      }
    }

    // Manual payment detection — overrides Facebook default; only overrides Eventbrite if strong signals
    const matchedKeyword = MANUAL_KEYWORDS.find(k => description.includes(k));
    if (matchedKeyword) {
      out.extracted_data.payment_keyword = matchedKeyword;
      if (out.detected_setup !== "eventbrite") {
        out.detected_setup = "manual";
      }
    }

    return out;
  } catch (e) {
    out.error = e instanceof Error ? e.message : "scrape failed";
    return out;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { urls } = await req.json();
    if (!Array.isArray(urls)) {
      return new Response(JSON.stringify({ error: "urls must be array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const results = [];
    for (const u of urls.slice(0, 30)) {
      results.push(await scrape(String(u).trim()));
    }
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

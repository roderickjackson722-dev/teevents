import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json().catch(() => ({}));
    const rawPage = typeof body.page_url === "string" ? body.page_url : "";
    const rawRef = typeof body.referrer === "string" ? body.referrer : "";
    const rawUa = typeof body.user_agent === "string" ? body.user_agent : "";

    // Input validation: cap lengths and require a recognisable internal path.
    const page_url = rawPage.slice(0, 2048);
    const referrer = rawRef.slice(0, 2048) || "Direct / No referrer";
    const user_agent = rawUa.slice(0, 512) || null;

    // Reject obvious garbage / external URLs to keep analytics clean.
    const isValidPath =
      page_url.startsWith("/") ||
      /^https?:\/\/([a-z0-9-]+\.)*(teevents\.golf|teevents\.lovable\.app|lovable\.app)(\/|$)/i.test(page_url);
    if (!page_url || !isValidPath) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get visitor IP from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || "unknown";

    // Lookup IP geolocation
    let city = null;
    let country = null;

    if (ip && ip !== "unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === "success") {
            city = geo.city || null;
            country = geo.country || null;
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

    const { error: insertError } = await supabaseAdmin
      .from("site_visits")
      .insert({
        page_url,
        referrer,
        user_agent,
        ip_address: ip.slice(0, 64),
        city,
        country,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
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

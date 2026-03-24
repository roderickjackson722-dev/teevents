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
    const { page_url, referrer, user_agent } = await req.json();

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
        page_url: page_url || "unknown",
        referrer: referrer || "Direct / No referrer",
        user_agent: user_agent || null,
        ip_address: ip,
        city,
        country,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
    } else {
      // Fire off real-time visitor notification email
      try {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/daily-visit-digest`;
        await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            visit: {
              page_url: page_url || "unknown",
              referrer: referrer || "Direct / No referrer",
              user_agent: user_agent || null,
              ip_address: ip,
              city,
              country,
            },
          }),
        });
      } catch (e) {
        console.warn("Visit notification failed:", e);
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

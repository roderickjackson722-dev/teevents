import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tournament_id, source, referrer } = await req.json();
    if (!tournament_id || !source) {
      return new Response(JSON.stringify({ error: "Missing tournament_id or source" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

    // Simple device detection
    let device_type = "desktop";
    if (/mobile|android|iphone/i.test(ua)) device_type = "mobile";
    else if (/tablet|ipad/i.test(ua)) device_type = "tablet";

    // Simple browser detection
    let browser = "Other";
    if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = "Chrome";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
    else if (/firefox/i.test(ua)) browser = "Firefox";
    else if (/edge/i.test(ua)) browser = "Edge";

    // Simple OS detection
    let os = "Other";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(ua)) os = "macOS";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad/i.test(ua)) os = "iOS";
    else if (/linux/i.test(ua)) os = "Linux";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    await sb.from("tournament_clicks").insert({
      tournament_id,
      source,
      referrer: referrer || null,
      ip_address: ip,
      user_agent: ua,
      device_type,
      browser,
      os,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

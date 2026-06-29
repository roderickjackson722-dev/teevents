import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ACTIONS = new Set(["login", "signup", "password_reset"]);
const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 60 * 60; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action } = await req.json().catch(() => ({}));
    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("check_auth_rate_limit", {
      _ip: ip,
      _action: action,
      _max: MAX_ATTEMPTS,
      _window_seconds: WINDOW_SECONDS,
    });

    if (error) {
      // Fail-open: never block legitimate users because of an internal error
      return new Response(JSON.stringify({ allowed: true, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowed = (data as any)?.allowed !== false;
    return new Response(JSON.stringify(data), {
      status: allowed ? 200 : 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ allowed: true, degraded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Marks an outreach lead as unsubscribed. Public endpoint (called from the
// unsubscribe page). Always returns 200 to avoid leaking which addresses exist.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("e") || (await req.json().catch(() => ({} as any))).email || "").trim().toLowerCase();
    if (email) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("outreach_leads")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .ilike("email", email);
    }
  } catch (_) { /* swallow */ }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// Marks an outreach lead as unsubscribed. Public endpoint (called from the
// unsubscribe page). Always returns 200 to avoid leaking which addresses exist.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyLink } from "../_shared/linkSig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body: any = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const email = String(url.searchParams.get("e") || body.email || "").trim().toLowerCase();
    const sig = url.searchParams.get("s") || body.s || null;
    // Only the signed link from our own email can unsubscribe an address.
    if (email && await verifyLink(email, sig)) {
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

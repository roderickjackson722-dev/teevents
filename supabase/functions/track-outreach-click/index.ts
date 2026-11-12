// Click tracker: records clicked_at + click_url and redirects to the target URL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyLink } from "../_shared/linkSig.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const target = url.searchParams.get("u") || "https://teevents.golf";

  // Only allow http/https targets
  // Only redirect to targets that our own outreach email signed for this queue row.
  let safeTarget = "https://teevents.golf";
  const signed = !!q && await verifyLink(`${q}|${target}`, url.searchParams.get("s"));
  if (signed) {
    try {
      const parsed = new URL(target);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") safeTarget = parsed.toString();
    } catch (_) { /* fall through */ }
  }

  try {
    if (q && signed) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("outreach_queue")
        .update({ clicked_at: new Date().toISOString(), click_url: safeTarget })
        .eq("id", q)
        .is("clicked_at", null);
    }
  } catch (_) { /* always redirect */ }

  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: safeTarget } });
});

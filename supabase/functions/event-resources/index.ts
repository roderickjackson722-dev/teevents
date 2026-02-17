import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, email } = await req.json();

    if (!event_id || !email) {
      return new Response(JSON.stringify({ error: "Missing event_id or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user is approved for this event
    const { data: request } = await supabase
      .from("event_access_requests")
      .select("status")
      .eq("event_id", event_id)
      .eq("email", email.trim().toLowerCase())
      .eq("status", "approved")
      .maybeSingle();

    if (!request) {
      return new Response(JSON.stringify({ error: "Not approved" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch resources
    const { data: resources } = await supabase
      .from("event_resources")
      .select("*")
      .eq("event_id", event_id)
      .order("sort_order", { ascending: true });

    return new Response(JSON.stringify({ resources: resources || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email.trim().toLowerCase();

    // Single event mode: verify approval and return resources
    if (event_id) {
      const { data: request } = await supabase
        .from("event_access_requests")
        .select("status")
        .eq("event_id", event_id)
        .eq("email", normalizedEmail)
        .eq("status", "approved")
        .maybeSingle();

      if (!request) {
        return new Response(JSON.stringify({ error: "Not approved" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: resources } = await supabase
        .from("event_resources")
        .select("*")
        .eq("event_id", event_id)
        .order("sort_order", { ascending: true });

      return new Response(JSON.stringify({ resources: resources || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Returning member mode: find all approved events with resources
    const { data: approvedRequests } = await supabase
      .from("event_access_requests")
      .select("event_id")
      .eq("email", normalizedEmail)
      .eq("status", "approved");

    if (!approvedRequests || approvedRequests.length === 0) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventIds = approvedRequests.map((r) => r.event_id);

    const { data: events } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .eq("status", "current")
      .order("date", { ascending: true });

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: allResources } = await supabase
      .from("event_resources")
      .select("*")
      .in("event_id", eventIds)
      .order("sort_order", { ascending: true });

    const eventsWithResources = events.map((event) => ({
      ...event,
      resources: (allResources || []).filter((r) => r.event_id === event.id),
    }));

    return new Response(JSON.stringify({ events: eventsWithResources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

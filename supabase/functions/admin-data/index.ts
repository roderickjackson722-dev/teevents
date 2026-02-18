import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon client to get user from JWT
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to check admin and fetch data (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Handle mutations
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "add-resource") {
        const { error } = await adminClient.from("event_resources").insert({
          event_id: body.event_id,
          title: body.title,
          description: body.description || null,
          link: body.link || null,
        });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "update-resource-link") {
        const { error } = await adminClient.from("event_resources").update({ link: body.link || null }).eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "delete-resource") {
        const { error } = await adminClient.from("event_resources").delete().eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "reorder-resources") {
        const updates: { id: string; sort_order: number }[] = body.updates || [];
        for (const u of updates) {
          await adminClient.from("event_resources").update({ sort_order: u.sort_order }).eq("id", u.id);
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "add-review") {
        const { error } = await adminClient.from("reviews").insert({
          author: body.author,
          organization: body.organization || "",
          text: body.text,
          sort_order: body.sort_order ?? 0,
        });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "update-review") {
        const { error } = await adminClient.from("reviews").update({
          author: body.author,
          organization: body.organization || "",
          text: body.text,
        }).eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "delete-review") {
        const { error } = await adminClient.from("reviews").delete().eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "reorder-reviews") {
        const updates: { id: string; sort_order: number }[] = body.updates || [];
        for (const u of updates) {
          await adminClient.from("reviews").update({ sort_order: u.sort_order }).eq("id", u.id);
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "reorder-events") {
        const updates: { id: string; sort_order: number }[] = body.updates || [];
        for (const u of updates) {
          await adminClient.from("events").update({ sort_order: u.sort_order }).eq("id", u.id);
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "grant-access") {
        const email = (body.email || "").trim().toLowerCase();
        if (!body.event_id || !email || !body.name) {
          return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: existing } = await adminClient
          .from("event_access_requests")
          .select("id, status")
          .eq("event_id", body.event_id)
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          if (existing.status === "approved") {
            return new Response(JSON.stringify({ error: "Already approved" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const { error } = await adminClient.from("event_access_requests").update({ status: "approved" }).eq("id", existing.id);
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          const { error } = await adminClient.from("event_access_requests").insert({
            event_id: body.event_id,
            email,
            name: body.name.trim(),
            status: "approved",
          });
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "add-approved-email") {
        const email = (body.email || "").trim().toLowerCase();
        if (!body.event_id || !email) {
          return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await adminClient.from("approved_emails").insert({ event_id: body.event_id, email });
        if (error) return new Response(JSON.stringify({ error: error.code === "23505" ? "Email already added" : error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "delete-approved-email") {
        const { error } = await adminClient.from("approved_emails").delete().eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "bulk-add-approved-emails") {
        const emails: string[] = body.emails || [];
        const eventId = body.event_id;
        if (!eventId || !emails.length) {
          return new Response(JSON.stringify({ error: "Missing event or emails" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        let added = 0;
        let skipped = 0;
        for (const raw of emails) {
          const email = (raw || "").trim().toLowerCase();
          if (!email) { skipped++; continue; }
          const { error } = await adminClient.from("approved_emails").insert({ event_id: eventId, email });
          if (error) { skipped++; } else { added++; }
        }
        return new Response(JSON.stringify({ success: true, added, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "bulk-grant-access") {
        const entries: { name: string; email: string }[] = body.entries || [];
        const eventId = body.event_id;
        if (!eventId || !entries.length) {
          return new Response(JSON.stringify({ error: "Missing event or entries" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        let granted = 0;
        let skipped = 0;
        for (const entry of entries) {
          const email = (entry.email || "").trim().toLowerCase();
          const name = (entry.name || "").trim();
          if (!email || !name) { skipped++; continue; }
          const { data: existing } = await adminClient
            .from("event_access_requests")
            .select("id, status")
            .eq("event_id", eventId)
            .eq("email", email)
            .maybeSingle();
          if (existing && existing.status === "approved") { skipped++; continue; }
          if (existing) {
            await adminClient.from("event_access_requests").update({ status: "approved" }).eq("id", existing.id);
          } else {
            await adminClient.from("event_access_requests").insert({
              event_id: eventId, email, name, status: "approved",
            });
          }
          granted++;
        }
        return new Response(JSON.stringify({ success: true, granted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Default: fetch all admin data
    const [eventsRes, requestsRes, emailsRes, resourcesRes, reviewsRes] = await Promise.all([
      adminClient.from("events").select("*").order("sort_order", { ascending: true }),
      adminClient.from("event_access_requests").select("*").order("created_at", { ascending: false }),
      adminClient.from("approved_emails").select("*").order("created_at", { ascending: false }),
      adminClient.from("event_resources").select("*").order("sort_order", { ascending: true }),
      adminClient.from("reviews").select("*").order("sort_order", { ascending: true }),
    ]);

    return new Response(
      JSON.stringify({
        events: eventsRes.data || [],
        requests: requestsRes.data || [],
        approvedEmails: emailsRes.data || [],
        resources: resourcesRes.data || [],
        reviews: reviewsRes.data || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

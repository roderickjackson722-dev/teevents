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
    const CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    if (!CF_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is not configured");

    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_ZONE_ID) throw new Error("CLOUDFLARE_ZONE_ID is not configured");

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, hostname, tournament_id } = await req.json();

    if (!action || !tournament_id) {
      return new Response(JSON.stringify({ error: "action and tournament_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns this tournament via org membership
    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("id, organization_id, custom_domain")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CF_BASE = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/custom_hostnames`;

    if (action === "create") {
      if (!hostname) {
        return new Response(JSON.stringify({ error: "hostname is required for create" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanHostname = hostname.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim().toLowerCase();

      // Check if hostname already exists in Cloudflare
      const listRes = await fetch(`${CF_BASE}?hostname=${encodeURIComponent(cleanHostname)}`, {
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      });
      const listData = await listRes.json();

      if (listData.result && listData.result.length > 0) {
        // Already exists — return its status
        const existing = listData.result[0];
        return new Response(
          JSON.stringify({
            success: true,
            hostname_id: existing.id,
            hostname: existing.hostname,
            status: existing.status,
            ssl_status: existing.ssl?.status || "unknown",
            message: "Custom hostname already registered with Cloudflare.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the custom hostname
      const createRes = await fetch(CF_BASE, {
        method: "POST",
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname: cleanHostname,
          ssl: {
            method: "http",
            type: "dv",
            settings: {
              http2: "on",
              min_tls_version: "1.2",
            },
          },
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        console.error("Cloudflare create error:", JSON.stringify(createData));
        const errMsg = createData.errors?.[0]?.message || "Failed to register hostname with Cloudflare";
        return new Response(JSON.stringify({ error: errMsg, details: createData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = createData.result;
      return new Response(
        JSON.stringify({
          success: true,
          hostname_id: result.id,
          hostname: result.hostname,
          status: result.status,
          ssl_status: result.ssl?.status || "initializing",
          message: "Custom hostname registered! SSL certificate will be provisioned automatically.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const domainToDelete = hostname || tournament.custom_domain;
      if (!domainToDelete) {
        return new Response(JSON.stringify({ success: true, message: "No hostname to delete" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanHostname = domainToDelete.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").trim().toLowerCase();

      // Find the hostname in Cloudflare
      const listRes = await fetch(`${CF_BASE}?hostname=${encodeURIComponent(cleanHostname)}`, {
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      });
      const listData = await listRes.json();

      if (!listData.result || listData.result.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "Hostname not found in Cloudflare (already removed)." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hostnameId = listData.result[0].id;
      const deleteRes = await fetch(`${CF_BASE}/${hostnameId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      });
      const deleteData = await deleteRes.json();

      if (!deleteRes.ok || !deleteData.success) {
        console.error("Cloudflare delete error:", JSON.stringify(deleteData));
        return new Response(JSON.stringify({ error: "Failed to remove hostname from Cloudflare" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Custom hostname removed from Cloudflare." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const domainToCheck = hostname || tournament.custom_domain;
      if (!domainToCheck) {
        return new Response(JSON.stringify({ status: "none", message: "No custom domain configured." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanHostname = domainToCheck.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").trim().toLowerCase();

      const listRes = await fetch(`${CF_BASE}?hostname=${encodeURIComponent(cleanHostname)}`, {
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      });
      const listData = await listRes.json();

      if (!listData.result || listData.result.length === 0) {
        return new Response(
          JSON.stringify({ status: "not_registered", message: "Hostname not registered with Cloudflare yet." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const entry = listData.result[0];
      return new Response(
        JSON.stringify({
          status: entry.status,
          ssl_status: entry.ssl?.status || "unknown",
          hostname: entry.hostname,
          hostname_id: entry.id,
          verification_errors: entry.verification_errors || [],
          message: entry.status === "active"
            ? "Custom domain is active and serving traffic!"
            : `Status: ${entry.status}. SSL: ${entry.ssl?.status || "pending"}.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use create, delete, or status." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-custom-hostname error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

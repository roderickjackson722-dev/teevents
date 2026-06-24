import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CUSTOM_DOMAIN_ORIGIN = "custom-domains.teevents.golf";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeHostname = (hostname: string) =>
  hostname.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim().toLowerCase();

const buildHostnamePayload = (hostname: string) => ({
  hostname,
  custom_origin_server: CUSTOM_DOMAIN_ORIGIN,
  ssl: {
    method: "http",
    type: "dv",
    settings: {
      http2: "on",
      min_tls_version: "1.2",
    },
  },
});

const checkHostnameReachability = async (hostname: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`https://${hostname}/`, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "TeeVents-Domain-Check/1.0" },
    });

    return {
      reachable: response.status < 500,
      status: response.status,
      isCloudflareTimeout: response.status === 522,
    };
  } catch (err) {
    return {
      reachable: false,
      status: null,
      isCloudflareTimeout: String(err).toLowerCase().includes("abort"),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const patchCustomOrigin = async (baseUrl: string, hostnameId: string, token: string) => {
  const patchRes = await fetch(`${baseUrl}/${hostnameId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ custom_origin_server: CUSTOM_DOMAIN_ORIGIN }),
  });

  const patchData = await patchRes.json();
  return { patchRes, patchData };
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

      const cleanHostname = normalizeHostname(hostname);

      const listRes = await fetch(`${CF_BASE}?hostname=${encodeURIComponent(cleanHostname)}`, {
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      });
      const listData = await listRes.json();

      if (listData.result && listData.result.length > 0) {
        const existing = listData.result[0];
        const { patchRes, patchData } = await patchCustomOrigin(CF_BASE, existing.id, CF_API_TOKEN);
        const updated = patchRes.ok && patchData.success ? patchData.result : existing;
        const reachability = await checkHostnameReachability(cleanHostname);
        const hasTimeout = reachability.isCloudflareTimeout || reachability.status === 522;

        return new Response(
          JSON.stringify({
            success: true,
            hostname_id: updated.id,
            hostname: updated.hostname,
            status: hasTimeout ? "origin_timeout" : updated.status,
            ssl_status: updated.ssl?.status || "unknown",
            origin: CUSTOM_DOMAIN_ORIGIN,
            reachability,
            message: hasTimeout
              ? "Hostname is registered, but Cloudflare is still timing out while reaching TeeVents. The origin route was refreshed — wait a few minutes, then check again."
              : "Custom hostname is registered and routed to TeeVents.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createRes = await fetch(CF_BASE, {
        method: "POST",
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildHostnamePayload(cleanHostname)),
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
          origin: CUSTOM_DOMAIN_ORIGIN,
          message: "Custom hostname registered and routed to TeeVents. SSL certificate will be provisioned automatically.",
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

      const cleanHostname = normalizeHostname(domainToDelete);

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

      const cleanHostname = normalizeHostname(domainToCheck);

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
      const reachability = await checkHostnameReachability(cleanHostname);
      const hasTimeout = reachability.isCloudflareTimeout || reachability.status === 522;

      return new Response(
        JSON.stringify({
          status: hasTimeout ? "origin_timeout" : entry.status,
          ssl_status: entry.ssl?.status || "unknown",
          hostname: entry.hostname,
          hostname_id: entry.id,
          origin: entry.custom_origin_server || CUSTOM_DOMAIN_ORIGIN,
          reachability,
          verification_errors: entry.verification_errors || [],
          message: hasTimeout
            ? "Cloudflare is active, but the hostname is timing out before it reaches TeeVents. Click Register / Retry SSL to refresh the origin route."
            : entry.status === "active"
            ? "Custom domain is active and serving traffic."
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
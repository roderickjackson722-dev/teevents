import { adminGuard } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await adminGuard(req, corsHeaders);
  if (denied) return denied;
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
  const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // List custom hostnames
  const list = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=golf.hbc1.edu`, { headers });
  const listJson = await list.json();
  const ch = listJson.result?.[0];

  const out: any = { current: ch };

  if (ch) {
    // Try PATCH with custom_origin_server + custom_origin_sni
    const patch = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${ch.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({
        custom_origin_server: "custom-domains.teevents.golf",
        custom_origin_sni: "custom-domains.teevents.golf",
      }),
    });
    out.patch = { status: patch.status, body: await patch.json() };
  }

  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

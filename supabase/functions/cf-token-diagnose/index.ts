const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async () => {
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
  const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const del = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/5fb06fd4e7444bbb954fef4e735f1b68`, { method: "DELETE", headers });
  return new Response(JSON.stringify({ status: del.status, body: await del.text() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
  const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const out: any = { zoneId, tokenLen: token.length, tokenPrefix: token.slice(0, 4) };

  const v = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers });
  out.verify = { status: v.status, body: await v.json() };

  const z = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, { headers });
  const zJson = await z.json();
  out.zone = { status: z.status, name: zJson.result?.name, account: zJson.result?.account?.name, errors: zJson.errors };

  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`, { headers });
  const rJson = await r.json();
  out.rulesets_list = { status: r.status, errors: rJson.errors };

  const create = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`, {
    method: "POST", headers,
    body: JSON.stringify({ name: "diag", description: "diag", kind: "zone", phase: "http_request_origin", rules: [] }),
  });
  out.create_origin = { status: create.status, body: await create.json() };

  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

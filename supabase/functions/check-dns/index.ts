import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CUSTOM_DOMAIN_ORIGIN = "custom-domains.teevents.golf";
const ORIGIN_RULE_REF_PREFIX = "teevents_custom_domain_";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeDomain = (domain: string) =>
  domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim().toLowerCase();

const originRuleRef = (hostname: string) =>
  `${ORIGIN_RULE_REF_PREFIX}${hostname.replace(/[^a-z0-9]/g, "_")}`.slice(0, 200);

const compactRule = (rule: any) => ({
  ref: rule.ref,
  expression: rule.expression,
  description: rule.description,
  action: rule.action,
  action_parameters: rule.action_parameters,
  ...(rule.enabled === false ? { enabled: false } : {}),
});

const getOrCreateOriginRuleset = async (zoneId: string, token: string) => {
  const base = `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const listRes = await fetch(base, { headers });
  const listData = await listRes.json();
  const existing = listData.result?.find((ruleset: any) => ruleset.phase === "http_request_origin" && ruleset.kind === "zone");

  if (existing) return { ruleset: existing, base, headers };

  const createRes = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "TeeVents custom domain origin routing",
      description: "Routes verified event custom domains to the TeeVents hosting origin.",
      kind: "zone",
      phase: "http_request_origin",
      rules: [],
    }),
  });
  const createData = await createRes.json();

  if (!createRes.ok || !createData.success) {
    throw new Error(createData.errors?.[0]?.message || "Failed to create Cloudflare origin ruleset");
  }

  return { ruleset: createData.result, base, headers };
};

const ensureOriginRule = async (zoneId: string, token: string, hostname: string) => {
  const { ruleset, base, headers } = await getOrCreateOriginRuleset(zoneId, token);
  const ref = originRuleRef(hostname);
  const existingRules = (ruleset.rules || []).map(compactRule).filter((rule: any) => rule.ref !== ref);
  const nextRule = {
    ref,
    expression: `http.host eq ${JSON.stringify(hostname)}`,
    description: `Route ${hostname} to TeeVents custom-domain origin`,
    action: "route",
    action_parameters: {
      host_header: CUSTOM_DOMAIN_ORIGIN,
      origin: { host: CUSTOM_DOMAIN_ORIGIN },
      sni: { value: CUSTOM_DOMAIN_ORIGIN },
    },
  };

  const updateRes = await fetch(`${base}/${ruleset.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: ruleset.name || "TeeVents custom domain origin routing",
      description: ruleset.description || "Routes verified event custom domains to the TeeVents hosting origin.",
      kind: "zone",
      phase: "http_request_origin",
      rules: [...existingRules, nextRule],
    }),
  });
  const updateData = await updateRes.json();

  if (!updateRes.ok || !updateData.success) {
    throw new Error(updateData.errors?.[0]?.message || "Failed to update Cloudflare origin routing rule");
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDomain = normalizeDomain(domain);

    const [aResponse, cnameResponse] = await Promise.all([
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`),
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`),
    ]);

    const aData = await aResponse.json();
    const cnameData = await cnameResponse.json();

    const aRecords = (aData.Answer || [])
      .filter((r: any) => r.type === 1)
      .map((r: any) => r.data);

    const cnameRecords = (cnameData.Answer || [])
      .filter((r: any) => r.type === 5)
      .map((r: any) => r.data?.replace(/\.$/, ""));

    const expectedCnames = [CUSTOM_DOMAIN_ORIGIN, "teevents.lovable.app", "www.teevents.golf", "teevents.golf"];
    const expectedIp = "185.158.133.1";

    const cnameCorrect = cnameRecords.some(
      (r: string) => expectedCnames.includes(r.toLowerCase())
    );
    const aCorrect = aRecords.some((r: string) => r === expectedIp);

    let status: "connected" | "misconfigured" | "not_found";
    let message: string;
    let originRouteRefreshed = false;
    let originRouteError: string | null = null;

    if (cnameCorrect || aCorrect) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
      const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

      if (supabaseUrl && serviceRoleKey && cfToken && cfZoneId) {
        const admin = createClient(supabaseUrl, serviceRoleKey);
        const { data: tournament } = await admin
          .from("tournaments")
          .select("id")
          .eq("custom_domain", cleanDomain)
          .eq("site_published", true)
          .maybeSingle();

        if (tournament) {
          try {
            await ensureOriginRule(cfZoneId, cfToken, cleanDomain);
            originRouteRefreshed = true;
          } catch (err) {
            originRouteError = String(err).replace(/^Error:\s*/, "");
          }
        }
      }

      status = originRouteError ? "misconfigured" : "connected";
      message = originRouteError
        ? `DNS is pointing to TeeVents, but the Cloudflare API token cannot refresh the required origin route (${originRouteError}). Update the Cloudflare token with Origin Rules write access, then run Register / Retry SSL again.`
        : originRouteRefreshed
        ? "DNS is correctly pointing to TeeVents and the hostname route was refreshed. Cloudflare may need a few minutes to apply it."
        : "Your domain is correctly pointing to TeeVents. If the browser still shows 522, click Register / Retry SSL to refresh the hostname route.";
    } else if (aRecords.length > 0 || cnameRecords.length > 0) {
      status = "misconfigured";
      const currentValue = cnameRecords.length > 0
        ? `CNAME → ${cnameRecords[0]}`
        : `A → ${aRecords[0]}`;
      message = `Your domain is resolving, but points to the wrong destination (${currentValue}). Please update your DNS records.`;
    } else {
      status = "not_found";
      message = "No DNS records found for this domain yet. If you just added them, please wait up to 48 hours for propagation.";
    }

    return new Response(
      JSON.stringify({ status, message, originRouteRefreshed, records: { a: aRecords, cname: cnameRecords } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to check DNS", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
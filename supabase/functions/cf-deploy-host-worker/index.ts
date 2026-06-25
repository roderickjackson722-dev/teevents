// Sets up: proxy subdomain on teevents.golf + worker route + retargets SaaS custom hostnames
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CF_API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'teevents.golf';
const ORIGIN_HOST = 'custom-domains.teevents.golf';
const PROXY_SUBDOMAIN = 'saas-proxy'; // saas-proxy.teevents.golf
const WORKER_NAME = 'teevents-host-rewriter';

const WORKER_SCRIPT = `
const ORIGIN = "${ORIGIN_HOST}";
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // The Host header Cloudflare sent us is the customer's custom hostname (set by SaaS resolveOverride)
    const originalHost = request.headers.get("x-forwarded-host") || url.hostname;
    url.hostname = ORIGIN;
    const headers = new Headers(request.headers);
    headers.set("Host", ORIGIN);
    headers.set("X-Forwarded-Host", originalHost);
    headers.set("X-Original-Host", originalHost);
    return fetch(new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    }));
  }
}
`;

async function cf(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const token = Deno.env.get('CLOUDFLARE_API_TOKEN');
  if (!token) return new Response(JSON.stringify({ error: 'no token' }), { status: 500, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const hostnames: string[] = body.hostnames || ['golf.hbc1.edu'];
  const steps: any[] = [];

  // Zone
  const z = await cf(token, `/zones?name=${ZONE_NAME}`);
  const zoneId = z.json?.result?.[0]?.id;
  const accountId = z.json?.result?.[0]?.account?.id;
  steps.push({ step: 'zone', zoneId, accountId });

  // 1. Create proxied DNS record saas-proxy.teevents.golf -> dummy (proxied so worker intercepts)
  const dnsList = await cf(token, `/zones/${zoneId}/dns_records?name=${PROXY_SUBDOMAIN}.${ZONE_NAME}`);
  let dnsId = dnsList.json?.result?.[0]?.id;
  if (!dnsId) {
    const dnsCreate = await cf(token, `/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'A', name: PROXY_SUBDOMAIN, content: '192.0.2.1', proxied: true, ttl: 1 }),
    });
    dnsId = dnsCreate.json?.result?.id;
    steps.push({ step: 'dns_create', status: dnsCreate.status, errors: dnsCreate.json?.errors, dnsId });
  } else {
    steps.push({ step: 'dns_exists', dnsId });
  }

  // 2. Upload worker
  const metadata = { main_module: 'worker.js', compatibility_date: '2024-09-01' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('worker.js', new Blob([WORKER_SCRIPT], { type: 'application/javascript+module' }), 'worker.js');
  const up = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${WORKER_NAME}`, {
    method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: form,
  });
  const upJson = await up.json().catch(() => ({}));
  steps.push({ step: 'worker_upload', success: upJson?.success, errors: upJson?.errors });

  // 3. Worker route on proxy subdomain
  const proxyPattern = `${PROXY_SUBDOMAIN}.${ZONE_NAME}/*`;
  const routes = await cf(token, `/zones/${zoneId}/workers/routes`);
  const existingProxyRoute = routes.json?.result?.find((r: any) => r.pattern === proxyPattern);
  if (!existingProxyRoute) {
    const rr = await cf(token, `/zones/${zoneId}/workers/routes`, {
      method: 'POST', body: JSON.stringify({ pattern: proxyPattern, script: WORKER_NAME }),
    });
    steps.push({ step: 'proxy_route_create', status: rr.status, errors: rr.json?.errors, success: rr.json?.success });
  } else {
    steps.push({ step: 'proxy_route_exists', id: existingProxyRoute.id });
  }

  // 4. Clean up direct-hostname routes from prior attempt (they don't work for SaaS)
  for (const r of (routes.json?.result || [])) {
    for (const h of hostnames) {
      if (r.pattern === `${h}/*`) {
        const del = await cf(token, `/zones/${zoneId}/workers/routes/${r.id}`, { method: 'DELETE' });
        steps.push({ step: 'old_route_delete', pattern: r.pattern, status: del.status });
      }
    }
  }

  // 5. Update each SaaS custom hostname to use custom_origin_server = saas-proxy.teevents.golf
  const proxyHost = `${PROXY_SUBDOMAIN}.${ZONE_NAME}`;
  const chResults: any[] = [];
  for (const h of hostnames) {
    const list = await cf(token, `/zones/${zoneId}/custom_hostnames?hostname=${h}`);
    const ch = list.json?.result?.[0];
    if (!ch) { chResults.push({ host: h, error: 'not found' }); continue; }
    const patch = await cf(token, `/zones/${zoneId}/custom_hostnames/${ch.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        custom_origin_server: proxyHost,
      }),
    });
    chResults.push({ host: h, id: ch.id, status: patch.status, errors: patch.json?.errors, success: patch.json?.success });
  }
  steps.push({ step: 'custom_hostnames_patch', chResults });

  return new Response(JSON.stringify({ ok: true, steps }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// Deploys a Cloudflare Worker that rewrites Host header from custom domains
// to custom-domains.teevents.golf and binds it to a route per custom hostname.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CF_API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'teevents.golf';
const ORIGIN_HOST = 'custom-domains.teevents.golf';
const WORKER_NAME = 'teevents-host-rewriter';

const WORKER_SCRIPT = `
const ORIGIN = "${ORIGIN_HOST}";
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const originalHost = url.hostname;
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
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = Deno.env.get('CLOUDFLARE_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ error: 'CLOUDFLARE_API_TOKEN missing' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const hostnames: string[] = body.hostnames || ['golf.hbc1.edu'];

  const steps: any[] = [];

  // 1. Get zone id
  const zoneRes = await cf(token, `/zones?name=${ZONE_NAME}`);
  const zoneId = zoneRes.json?.result?.[0]?.id;
  const accountId = zoneRes.json?.result?.[0]?.account?.id;
  steps.push({ step: 'get_zone', zoneId, accountId, status: zoneRes.status });
  if (!zoneId || !accountId) {
    return new Response(JSON.stringify({ error: 'zone not found', steps }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Upload worker script (module syntax) via multipart
  const metadata = {
    main_module: 'worker.js',
    compatibility_date: '2024-09-01',
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('worker.js', new Blob([WORKER_SCRIPT], { type: 'application/javascript+module' }), 'worker.js');

  const uploadRes = await fetch(
    `${CF_API}/accounts/${accountId}/workers/scripts/${WORKER_NAME}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    }
  );
  const uploadJson = await uploadRes.json().catch(() => ({}));
  steps.push({ step: 'upload_worker', status: uploadRes.status, errors: uploadJson?.errors, success: uploadJson?.success });

  if (!uploadJson?.success) {
    return new Response(JSON.stringify({ error: 'worker upload failed', steps }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Add routes per hostname
  const routeResults: any[] = [];
  for (const host of hostnames) {
    const pattern = `${host}/*`;
    // List existing routes to avoid duplicates
    const existing = await cf(token, `/zones/${zoneId}/workers/routes`);
    const dup = existing.json?.result?.find((r: any) => r.pattern === pattern);
    if (dup) {
      routeResults.push({ host, pattern, existing: true, id: dup.id });
      continue;
    }
    const routeRes = await cf(token, `/zones/${zoneId}/workers/routes`, {
      method: 'POST',
      body: JSON.stringify({ pattern, script: WORKER_NAME }),
    });
    routeResults.push({ host, pattern, status: routeRes.status, errors: routeRes.json?.errors, success: routeRes.json?.success, id: routeRes.json?.result?.id });
  }
  steps.push({ step: 'routes', routeResults });

  return new Response(JSON.stringify({ ok: true, steps }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

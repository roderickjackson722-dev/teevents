// Bind the existing teevents-proxy worker to a custom hostname route + reset custom_origin_server.
// This mirrors the proven setup used for www.yourgolftournament.com.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminGuard } from '../_shared/auth.ts';
const CF_API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'teevents.golf';
const FALLBACK_ORIGIN = 'custom-domains.teevents.golf';
const PROXY_WORKER = 'teevents-proxy';

async function cf(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const denied = await adminGuard(req, corsHeaders);
  if (denied) return denied;
  const token = Deno.env.get('CLOUDFLARE_API_TOKEN');
  if (!token) return new Response(JSON.stringify({ error: 'no token' }), { status: 500, headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const hostnames: string[] = body.hostnames || ['golf.hbc1.edu'];
  const steps: any[] = [];

  const z = await cf(token, `/zones?name=${ZONE_NAME}`);
  const zoneId = z.json?.result?.[0]?.id;
  steps.push({ step: 'zone', zoneId });

  // existing routes
  const routes = await cf(token, `/zones/${zoneId}/workers/routes`);
  const existing = routes.json?.result || [];

  for (const h of hostnames) {
    // 1. Reset custom_origin_server back to fallback (clean)
    const list = await cf(token, `/zones/${zoneId}/custom_hostnames?hostname=${h}`);
    const ch = list.json?.result?.[0];
    if (ch) {
      const patch = await cf(token, `/zones/${zoneId}/custom_hostnames/${ch.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ custom_origin_server: FALLBACK_ORIGIN }),
      });
      steps.push({ step: 'reset_origin', host: h, status: patch.status, errors: patch.json?.errors });
    } else {
      steps.push({ step: 'ch_missing', host: h });
      continue;
    }

    // 2. Ensure worker route hostname/* -> teevents-proxy
    const pattern = `${h}/*`;
    const dup = existing.find((r: any) => r.pattern === pattern);
    if (dup) {
      if (dup.script !== PROXY_WORKER) {
        const upd = await cf(token, `/zones/${zoneId}/workers/routes/${dup.id}`, {
          method: 'PUT', body: JSON.stringify({ pattern, script: PROXY_WORKER }),
        });
        steps.push({ step: 'route_update', host: h, status: upd.status, errors: upd.json?.errors });
      } else {
        steps.push({ step: 'route_already_correct', host: h });
      }
    } else {
      const rr = await cf(token, `/zones/${zoneId}/workers/routes`, {
        method: 'POST', body: JSON.stringify({ pattern, script: PROXY_WORKER }),
      });
      steps.push({ step: 'route_create', host: h, status: rr.status, errors: rr.json?.errors, success: rr.json?.success });
    }
  }

  return new Response(JSON.stringify({ ok: true, steps }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

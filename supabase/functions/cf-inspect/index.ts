import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminGuard } from '../_shared/auth.ts';
const CF_API = 'https://api.cloudflare.com/client/v4';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const denied = await adminGuard(req, corsHeaders);
  if (denied) return denied;
  const token = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
  const h = { 'Authorization': `Bearer ${token}` };
  const z = await (await fetch(`${CF_API}/zones?name=teevents.golf`, { headers: h })).json();
  const zoneId = z.result[0].id;
  const accountId = z.result[0].account.id;
  const routes = await (await fetch(`${CF_API}/zones/${zoneId}/workers/routes`, { headers: h })).json();
  const scripts = await (await fetch(`${CF_API}/accounts/${accountId}/workers/scripts`, { headers: h })).json();
  const ch = await (await fetch(`${CF_API}/zones/${zoneId}/custom_hostnames?hostname=golf.hbc1.edu`, { headers: h })).json();
  const dns = await (await fetch(`${CF_API}/zones/${zoneId}/dns_records?name=saas-proxy.teevents.golf`, { headers: h })).json();
  return new Response(JSON.stringify({ routes: routes.result, scripts: (scripts.result||[]).map((s:any)=>({id:s.id,modified:s.modified_on})), customHostname: ch.result?.[0], dns: dns.result }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

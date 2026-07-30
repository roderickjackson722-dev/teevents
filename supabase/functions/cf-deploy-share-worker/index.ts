// Deploys/updates the `teevents-share` Cloudflare Worker that powers clean
// crawler-friendly share links at https://www.teevents.golf/share/*
// It proxies to the `share-preview` edge function, which renders per-page
// Open Graph tags and redirects real visitors to the app.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CF_API = "https://api.cloudflare.com/client/v4";
const ZONE_NAME = "teevents.golf";
const SCRIPT_NAME = "teevents-share";
const SHARE_HOST = "share.teevents.golf";

async function cf(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const CRAWLER_WORDS = [
  "facebookexternalhit","facebot","twitterbot","linkedinbot","slackbot","slack-imgproxy",
  "discordbot","whatsapp","telegrambot","skypeuripreview","pinterest","redditbot","embedly",
  "quora link preview","vkshare","applebot","imessagebot","bingbot","googlebot","iframely",
  "nuzzel","outbrain","mastodon","bluesky","opengraph","snippet","preview",
];
const CRAWLER_RE = `new RegExp(${JSON.stringify(CRAWLER_WORDS.join("|"))}, "i")`;


function workerSource(shareFnUrl: string) {
  return `const CRAWLER = ${CRAWLER_RE};
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const isShareHost = url.hostname.startsWith("share.");

    // On the main site we only intercept social/link-preview crawlers so real
    // visitors keep getting the normal app.
    if (!isShareHost && !CRAWLER.test(ua)) return fetch(request);

    const target = url.pathname + (url.search || "");
    const upstream = ${JSON.stringify(shareFnUrl)} + "?p=" + encodeURIComponent(target || "/");
    const res = await fetch(upstream, { headers: { "user-agent": ua } });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
    });
  },
};`;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "CLOUDFLARE_API_TOKEN not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const steps: unknown[] = [];
  const shareFnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/share-preview`;

  const z = await cf(token, `/zones?name=${ZONE_NAME}`);
  const zone = z.json?.result?.[0];
  const zoneId = zone?.id;
  const accountId = zone?.account?.id;
  steps.push({ step: "zone", zoneId, accountId });
  if (!zoneId || !accountId) {
    return new Response(JSON.stringify({ error: "zone lookup failed", steps }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Upload the worker (module syntax)
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({ main_module: "worker.js", compatibility_date: "2024-11-01" })], {
      type: "application/json",
    }),
  );
  form.append(
    "worker.js",
    new Blob([workerSource(shareFnUrl)], { type: "application/javascript+module" }),
    "worker.js",
  );
  const up = await cf(token, `/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}`, {
    method: "PUT",
    body: form,
  });
  steps.push({ step: "upload_worker", status: up.status, success: up.json?.success, errors: up.json?.errors });

  // 2. Proxied DNS record for the share host (AAAA 100:: is the standard
  // "worker only" placeholder — no origin server is involved).
  const dns = await cf(token, `/zones/${zoneId}/dns_records?name=${SHARE_HOST}`);
  const rec = dns.json?.result?.[0];
  if (!rec) {
    const cr = await cf(token, `/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({ type: "AAAA", name: SHARE_HOST, content: "100::", proxied: true, ttl: 1 }),
    });
    steps.push({ step: "dns_create", host: SHARE_HOST, status: cr.status, success: cr.json?.success, errors: cr.json?.errors });
  } else if (!rec.proxied) {
    const pr = await cf(token, `/zones/${zoneId}/dns_records/${rec.id}`, {
      method: "PATCH",
      body: JSON.stringify({ proxied: true }),
    });
    steps.push({ step: "dns_proxy_on", host: SHARE_HOST, status: pr.status, errors: pr.json?.errors });
  } else {
    steps.push({ step: "dns_already_correct", host: SHARE_HOST });
  }

  // 2b. Diagnostics: are the apex/www records inside this zone and proxied?
  const mainDns = await cf(token, `/zones/${zoneId}/dns_records?per_page=100`);
  steps.push({
    step: "dns_inventory",
    records: (mainDns.json?.result || [])
      .filter((r: { name: string }) => r.name === ZONE_NAME || r.name === `www.${ZONE_NAME}`)
      .map((r: { name: string; type: string; content: string; proxied: boolean }) => ({
        name: r.name, type: r.type, content: r.content, proxied: r.proxied,
      })),
  });

  // 3. Ensure worker routes: the share host plus crawler interception on the
  // public page paths of the main site (the worker passes real visitors through).
  const routes = await cf(token, `/zones/${zoneId}/workers/routes`);
  const existing = routes.json?.result || [];
  const patterns = [`${SHARE_HOST}/*`];
  for (const host of [ZONE_NAME, `www.${ZONE_NAME}`]) {
    for (const p of ["college", "t", "tournament", "live", "league"]) {
      patterns.push(`${host}/${p}/*`);
    }
  }
  for (const pattern of patterns) {
    const dup = existing.find((r: { pattern: string; id: string; script: string }) => r.pattern === pattern);
    if (dup) {
      if (dup.script !== SCRIPT_NAME) {
        const upd = await cf(token, `/zones/${zoneId}/workers/routes/${dup.id}`, {
          method: "PUT",
          body: JSON.stringify({ pattern, script: SCRIPT_NAME }),
        });
        steps.push({ step: "route_update", pattern, status: upd.status, errors: upd.json?.errors });
      } else {
        steps.push({ step: "route_already_correct", pattern });
      }
    } else {
      const rr = await cf(token, `/zones/${zoneId}/workers/routes`, {
        method: "POST",
        body: JSON.stringify({ pattern, script: SCRIPT_NAME }),
      });
      steps.push({ step: "route_create", pattern, status: rr.status, success: rr.json?.success, errors: rr.json?.errors });
    }
  }


  return new Response(JSON.stringify({ ok: true, steps }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

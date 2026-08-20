// Public one-click newsletter unsubscribe. Accepts a token (preferred) or an
// email address. Always returns 200 so we never leak which addresses exist.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

async function handle(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) return json({ ok: true });

  let token = "";
  let email = "";
  try {
    const u = new URL(request.url);
    token = (u.searchParams.get("t") || u.searchParams.get("token") || "").trim();
    email = (u.searchParams.get("e") || u.searchParams.get("email") || "").trim().toLowerCase();
    if (request.method === "POST") {
      const body: any = await request.json().catch(() => ({}));
      token = String(body.token || token || "").trim();
      email = String(body.email || email || "").trim().toLowerCase();
    }
  } catch {
    /* ignore */
  }

  if (!token && !email) return json({ ok: true });
  if (token === "preview") return json({ ok: true, preview: true });

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const patch = { status: "unsubscribed", unsubscribed_at: new Date().toISOString() } as any;
    if (token) await admin.from("newsletter_subscribers").update(patch).eq("unsubscribe_token", token);
    else await admin.from("newsletter_subscribers").update(patch).ilike("email", email);
  } catch {
    /* swallow */
  }

  return json({ ok: true });
}

export const Route = createFileRoute("/api/public/newsletter-unsubscribe")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }),
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});

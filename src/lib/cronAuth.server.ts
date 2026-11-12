// Server-only guard for scheduler-invoked public hooks. The scheduler presents the
// token stored in internal_cron_tokens('public_hooks'); server callers may instead
// use the service key bearer.
export async function isCronRequest(request: Request): Promise<boolean> {
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer && serviceKey && bearer === serviceKey) return true;
  const presented = (request.headers.get("x-cron-token") || "").trim();
  if (!presented) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("internal_cron_tokens").select("token").eq("name", "public_hooks").maybeSingle();
  return !!data?.token && presented === data.token;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

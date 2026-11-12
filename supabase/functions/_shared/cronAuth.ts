// Guard for scheduled/background edge functions.
// Allowed callers: the scheduler presenting the stored cron token
// (internal_cron_tokens 'edge_cron'), a server caller using the service key,
// or (when allowAdmin) a signed-in platform admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function cronGuard(
  req: Request,
  cors: Record<string, string> = {},
  opts: { allowAdmin?: boolean } = {},
): Promise<Response | null> {
  const deny = () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer && serviceKey && bearer === serviceKey) return null;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const presented = (req.headers.get("x-cron-token") || "").trim();
  if (presented) {
    const { data } = await admin.from("internal_cron_tokens").select("token").eq("name", "edge_cron").maybeSingle();
    if (data?.token && presented === data.token) return null;
    return deny();
  }

  if (opts.allowAdmin && bearer) {
    const { data: u } = await admin.auth.getUser(bearer);
    if (u?.user) {
      const { data: role } = await admin
        .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (role) return null;
    }
  }
  return deny();
}

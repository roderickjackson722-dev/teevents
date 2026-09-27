import { createFileRoute } from "@tanstack/react-router";
import { authUser, json, syncAll } from "@/lib/ghin.server";

// Platform admins: trigger a global sync of every upcoming handicap event and active league.
export const Route = createFileRoute("/api/ghin/sync-all")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authUser(request);
        if (!auth) return json({ error: "Sign in required" }, 401);
        const { data: isAdmin } = await auth.client.rpc("has_role", { _user_id: auth.userId, _role: "admin" });
        if (!isAdmin) return json({ error: "Admins only" }, 403);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return json(await syncAll(supabaseAdmin, `admin:${auth.userId}`, true));
      },
    },
  },
});

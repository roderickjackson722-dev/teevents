import { createFileRoute } from "@tanstack/react-router";
import { authUser, json, syncHandicapsForLeague } from "@/lib/ghin.server";

export const Route = createFileRoute("/api/ghin/sync-league/$leagueId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await authUser(request);
        if (!auth) return json({ error: "Sign in required" }, 401);
        if (!/^[0-9a-f-]{36}$/i.test(params.leagueId)) return json({ error: "Invalid league" }, 400);
        const { data } = await auth.client.from("league_members").select("id").eq("league_id", params.leagueId).limit(1);
        const { data: lg } = await auth.client.from("golf_leagues").select("id, organization_id").eq("id", params.leagueId).maybeSingle();
        if (!lg) return json({ error: "Not allowed" }, 403);
        const { data: isMember } = await auth.client.rpc("is_org_member", { _user_id: auth.userId, _org_id: lg.organization_id } as any);
        const { data: isAdmin } = await auth.client.rpc("has_role", { _user_id: auth.userId, _role: "admin" });
        if (!isMember && !isAdmin && !data) return json({ error: "Not allowed" }, 403);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return json(await syncHandicapsForLeague(supabaseAdmin, params.leagueId, auth.userId));
      },
    },
  },
});

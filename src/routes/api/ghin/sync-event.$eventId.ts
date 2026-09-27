import { createFileRoute } from "@tanstack/react-router";
import { authUser, json, syncHandicapsForEvent } from "@/lib/ghin.server";

export const Route = createFileRoute("/api/ghin/sync-event/$eventId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await authUser(request);
        if (!auth) return json({ error: "Sign in required" }, 401);
        if (!/^[0-9a-f-]{36}$/i.test(params.eventId)) return json({ error: "Invalid event" }, 400);
        // RLS: only org members (or admins) can read the event.
        const { data } = await auth.client.from("tournaments").select("id").eq("id", params.eventId).maybeSingle();
        if (!data) return json({ error: "Not allowed" }, 403);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return json(await syncHandicapsForEvent(supabaseAdmin, params.eventId, auth.userId));
      },
    },
  },
});

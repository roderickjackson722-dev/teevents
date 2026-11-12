// Daily GHIN auto-sync (pg_cron). Syncs only events/leagues with auto-sync on,
// and only players who have a GHIN number. Results are written to handicap_sync_logs.
import { createFileRoute } from "@tanstack/react-router";
import { isCronRequest, unauthorized } from "@/lib/cronAuth.server";
import { json, syncAll } from "@/lib/ghin.server";

export const Route = createFileRoute("/api/public/hooks/handicap-daily-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isCronRequest(request))) return json({ error: "Unauthorized" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return json(await syncAll(supabaseAdmin, "cron"));
      },
    },
  },
});

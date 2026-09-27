// Daily GHIN auto-sync (pg_cron). Syncs only events/leagues with auto-sync on,
// and only players who have a GHIN number. Results are written to handicap_sync_logs.
import { createFileRoute } from "@tanstack/react-router";
import { json, syncAll } from "@/lib/ghin.server";

export const Route = createFileRoute("/api/public/hooks/handicap-daily-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const allowed = [process.env["SUPABASE_PUBLISHABLE_KEY"], process.env["SUPABASE_ANON_KEY"], import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY].filter(Boolean);
        if (!key || !allowed.includes(key)) return json({ error: "Unauthorized" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return json(await syncAll(supabaseAdmin, "cron"));
      },
    },
  },
});

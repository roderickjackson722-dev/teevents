import { createFileRoute } from "@tanstack/react-router";
import { authUser, json, lookupHandicapByGhinId } from "@/lib/ghin.server";

export const Route = createFileRoute("/api/ghin/lookup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authUser(request);
        if (!auth) return json({ error: "Sign in required" }, 401);
        const url = new URL(request.url);
        const ghinId = (url.searchParams.get("ghinId") || "").trim();
        const lastName = (url.searchParams.get("lastName") || "").trim().slice(0, 80);
        if (!/^\d{4,10}$/.test(ghinId)) return json({ status: "error", message: "GHIN numbers are 4–10 digits." }, 400);
        const result = await lookupHandicapByGhinId(ghinId, lastName || null);
        if (result.status === "error") {
          console.error("[ghin] lookup failed", ghinId, result.message);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any).from("handicap_sync_logs").insert({
            scope: "lookup", triggered_by: auth.userId, total: 1, failed: 1,
            errors: [{ player: `GHIN ${ghinId}`, message: result.message }],
          });
        }
        return json(result);
      },
    },
  },
});

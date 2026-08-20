// Automatic league payment confirmation.
//
// Called (a) by the payer's browser the instant they return from Stripe Checkout,
// (b) by the 5-minute background schedule with { all: true }, and (c) by the League
// Payments tab when a manager opens it. It never trusts input for authorization: it
// only looks up payments that already exist in our own database and asks Stripe for
// their real status, so there is nothing an outside caller can forge or read.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { reconcileLeaguePayments } from "@/lib/leagueReconcile.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

async function run(input: { session_id?: string; league_id?: string; all?: boolean }) {
  const admin = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    { auth: { persistSession: false } },
  );
  const result = await reconcileLeaguePayments(admin, {
    sessionId: input.session_id,
    leagueId: input.all ? undefined : input.league_id,
  });
  return json({ ok: true, ...result });
}

export const Route = createFileRoute("/api/public/league-payment-confirm")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return run({
          session_id: url.searchParams.get("session_id") || undefined,
          league_id: url.searchParams.get("league_id") || undefined,
          all: url.searchParams.get("all") === "true" || url.searchParams.get("all") === "1",
        });
      },
      POST: async ({ request }) => {
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        return run(body || {});
      },
    },
  },
});

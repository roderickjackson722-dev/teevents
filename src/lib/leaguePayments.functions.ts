import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLeagueManager, buildLeagueLedger } from "./leaguePayments.server";

/**
 * Every COMPLETED league transaction — online (Stripe) and manual/offline entries —
 * with the full gross / fees / net breakdown. Pending checkouts are intentionally
 * excluded: an abandoned checkout is not a payment.
 */
export const listLeaguePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: string }) => {
    if (!input?.leagueId) throw new Error("leagueId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertLeagueManager(context.supabase, supabaseAdmin, context.userId, data.leagueId);
    return await buildLeagueLedger(supabaseAdmin, data.leagueId);
  });


/**
 * Manual trigger for the same automatic reconciliation that runs on the Stripe
 * return, on a 5-minute background schedule, and when the Payments tab loads.
 * Kept so a manager can force a check, but nothing depends on them pressing it.
 */
export const syncLeaguePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: string }) => {
    if (!input?.leagueId) throw new Error("leagueId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertLeagueManager(context.supabase, supabaseAdmin, context.userId, data.leagueId);
    const { reconcileLeaguePayments } = await import("./leagueReconcile.server");
    const result = await reconcileLeaguePayments(supabaseAdmin, { leagueId: data.leagueId });
    return { checked: result.checked, recovered: result.recovered, reconciled: result.emails };
  });


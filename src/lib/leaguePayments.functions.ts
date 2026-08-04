import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertLeagueManager(supabase: any, admin: any, userId: string, leagueId: string) {
  const { data: league } = await admin
    .from("golf_leagues")
    .select("id, league_name, organization_id")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) throw new Error("League not found");
  const { data: membership } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("organization_id", league.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw new Error("Not authorized for this league");
  return league;
}

/** Payment status for every league membership + event registration payment. */
export const listLeaguePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: string }) => {
    if (!input?.leagueId) throw new Error("leagueId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertLeagueManager(context.supabase, supabaseAdmin, context.userId, data.leagueId);

    const { data: rows, error } = await supabaseAdmin
      .from("league_payments")
      .select(
        "id, kind, amount_cents, platform_fee_cents, status, payer_email, created_at, updated_at, stripe_session_id, stripe_payment_intent, member_id, event_id, registration_id",
      )
      .eq("league_id", data.leagueId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const memberIds = Array.from(new Set((rows || []).map((r: any) => r.member_id).filter(Boolean)));
    const eventIds = Array.from(new Set((rows || []).map((r: any) => r.event_id).filter(Boolean)));

    const [{ data: members }, { data: events }] = await Promise.all([
      memberIds.length
        ? supabaseAdmin.from("league_members").select("id, member_name, email").in("id", memberIds)
        : Promise.resolve({ data: [] as any[] }),
      eventIds.length
        ? supabaseAdmin.from("league_events").select("id, event_name, event_date").in("id", eventIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const mm = new Map((members || []).map((m: any) => [m.id, m]));
    const em = new Map((events || []).map((e: any) => [e.id, e]));

    return {
      payments: (rows || []).map((r: any) => ({
        ...r,
        member_name: mm.get(r.member_id)?.member_name ?? null,
        member_email: mm.get(r.member_id)?.email ?? r.payer_email ?? null,
        event_name: em.get(r.event_id)?.event_name ?? (r.kind === "membership" ? "League Membership" : null),
        event_date: em.get(r.event_id)?.event_date ?? null,
      })),
    };
  });

/**
 * Re-checks every pending payment directly against Stripe and marks the ones that
 * actually completed as paid. Recovers payments whose webhook never arrived.
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

    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Payments are not configured");

    const { data: pending } = await supabaseAdmin
      .from("league_payments")
      .select("id, stripe_session_id, stripe_account_id, member_id, registration_id, kind")
      .eq("league_id", data.leagueId)
      .eq("status", "pending")
      .not("stripe_session_id", "is", null);

    let recovered = 0;
    const checked = (pending || []).length;

    for (const p of pending || []) {
      const headers: Record<string, string> = { Authorization: `Bearer ${stripeKey}` };
      if (p.stripe_account_id) headers["Stripe-Account"] = p.stripe_account_id;
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${p.stripe_session_id}`, { headers });
      if (!resp.ok) continue;
      const session: any = await resp.json();
      if (session.payment_status !== "paid") continue;

      await supabaseAdmin
        .from("league_payments")
        .update({
          status: "paid",
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      if (p.registration_id) {
        await supabaseAdmin
          .from("league_event_registrations")
          .update({ fee_paid: true, registration_fee_paid: true, paid_at: new Date().toISOString() })
          .eq("id", p.registration_id);
      }
      if (p.kind === "membership" && p.member_id) {
        await supabaseAdmin
          .from("league_members")
          .update({ membership_fee_paid: true, membership_status: "active" })
          .eq("id", p.member_id);
      }
      recovered += 1;
    }

    return { checked, recovered };
  });

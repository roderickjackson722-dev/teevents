import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Current Flat-Rate Pro state for one tournament. */
export const getFlatRateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertOrgMemberForTournament, FLAT_RATE_AMOUNT_CENTS } = await import("./flatRate.server");
    const t = await assertOrgMemberForTournament(
      context.supabase,
      supabaseAdmin,
      context.userId,
      data.tournamentId,
    );
    return {
      tournament_id: t.id,
      title: t.title,
      flat_rate_enabled: !!t.flat_rate_enabled,
      flat_rate_paid: !!t.flat_rate_paid,
      flat_rate_paid_at: t.flat_rate_paid_at ?? null,
      admin_override: !!t.flat_rate_admin_override,
      override_reason: t.flat_rate_override_reason ?? null,
      amount_cents: t.flat_rate_amount_cents ?? FLAT_RATE_AMOUNT_CENTS,
    };
  });

/** Creates the Stripe Checkout session for the one-time $299 flat fee. */
export const createFlatRateCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; origin: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertOrgMemberForTournament, logFlatRate, FLAT_RATE_AMOUNT_CENTS } = await import("./flatRate.server");
    const t = await assertOrgMemberForTournament(
      context.supabase,
      supabaseAdmin,
      context.userId,
      data.tournamentId,
    );
    if (t.flat_rate_enabled) throw new Error("Flat-Rate Pro is already active for this event");

    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Stripe is not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });

    const origin = data.origin || "https://teevents.golf";
    const amount = t.flat_rate_amount_cents ?? FLAT_RATE_AMOUNT_CENTS;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TeeVents Flat-Rate Pro — One Event",
              description: `Removes the 5% platform fee for: ${t.title}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/upgrade?tournament_id=${t.id}&flat_rate_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/upgrade?tournament_id=${t.id}&flat_rate_canceled=1`,
      metadata: {
        type: "flat_rate_pro",
        tournament_id: t.id,
        organization_id: t.organization_id,
        user_id: context.userId,
      },
    });

    await logFlatRate(supabaseAdmin, {
      tournament_id: t.id,
      action: "checkout_started",
      actor_user_id: context.userId,
      amount_cents: amount,
      stripe_session_id: session.id,
    });

    return { url: session.url };
  });

/** Confirms the Stripe session and activates Flat-Rate Pro for the event. */
export const verifyFlatRatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId) throw new Error("sessionId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertOrgMemberForTournament, logFlatRate, FLAT_RATE_AMOUNT_CENTS } = await import("./flatRate.server");

    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Stripe is not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });

    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    const tournamentId = session.metadata?.tournament_id;
    if (!tournamentId) throw new Error("Missing tournament in session metadata");

    // Caller must belong to the organization that owns this tournament.
    await assertOrgMemberForTournament(context.supabase, supabaseAdmin, context.userId, tournamentId);

    if (session.payment_status !== "paid") return { verified: false as const };

    await supabaseAdmin
      .from("tournaments")
      .update({
        flat_rate_enabled: true,
        flat_rate_paid: true,
        flat_rate_paid_at: new Date().toISOString(),
      })
      .eq("id", tournamentId);

    await logFlatRate(supabaseAdmin, {
      tournament_id: tournamentId,
      action: "purchased",
      actor_user_id: context.userId,
      amount_cents: session.amount_total ?? FLAT_RATE_AMOUNT_CENTS,
      stripe_session_id: session.id,
    });

    return { verified: true as const, tournament_id: tournamentId };
  });

/** Platform-admin only: grant or revoke Flat-Rate Pro with no charge. */
export const setFlatRateOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; enabled: boolean; reason?: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    if (typeof input.enabled !== "boolean") throw new Error("enabled is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertPlatformAdmin, logFlatRate } = await import("./flatRate.server");
    await assertPlatformAdmin(context.supabase, context.userId);

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, flat_rate_paid")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!t) throw new Error("Tournament not found");

    await supabaseAdmin
      .from("tournaments")
      .update({
        flat_rate_admin_override: data.enabled,
        flat_rate_override_reason: data.enabled ? (data.reason ?? null) : null,
        // A paid event stays on flat rate even if an override is later removed.
        flat_rate_enabled: data.enabled ? true : !!t.flat_rate_paid,
      })
      .eq("id", data.tournamentId);

    await logFlatRate(supabaseAdmin, {
      tournament_id: data.tournamentId,
      action: data.enabled ? "admin_override_granted" : "admin_override_removed",
      actor_user_id: context.userId,
      amount_cents: 0,
      reason: data.reason ?? null,
    });

    return { ok: true as const };
  });

/** Platform-admin only: tournaments with their flat-rate state, for the override screen. */
export const listFlatRateTournaments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertPlatformAdmin } = await import("./flatRate.server");
    await assertPlatformAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("tournaments")
      .select("id, title, date, flat_rate_enabled, flat_rate_paid, flat_rate_admin_override, flat_rate_override_reason")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data?.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows || []) as Array<{
      id: string;
      title: string;
      date: string | null;
      flat_rate_enabled: boolean | null;
      flat_rate_paid: boolean | null;
      flat_rate_admin_override: boolean | null;
      flat_rate_override_reason: string | null;
    }>;
  });

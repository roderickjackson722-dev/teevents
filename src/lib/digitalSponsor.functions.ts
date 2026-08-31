import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Current Digital Sponsor package state for one tournament. */
export const getDigitalSponsorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertOrgMemberForDigitalSponsor, DIGITAL_SPONSOR_AMOUNT_CENTS } = await import(
      "./digitalSponsor.server"
    );
    const t = await assertOrgMemberForDigitalSponsor(
      context.supabase,
      supabaseAdmin,
      context.userId,
      data.tournamentId,
    );
    return {
      tournament_id: t.id,
      title: t.title as string,
      purchased: !!t.digital_sponsor_purchased,
      purchased_at: t.digital_sponsor_purchased_at ?? null,
      amount_cents: t.digital_sponsor_amount_cents ?? DIGITAL_SPONSOR_AMOUNT_CENTS,
    };
  });

/** Creates the Stripe Checkout session for the one-time $799 Digital Sponsor package. */
export const createDigitalSponsorCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; origin: string; returnPath?: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertOrgMemberForDigitalSponsor, DIGITAL_SPONSOR_AMOUNT_CENTS } = await import(
      "./digitalSponsor.server"
    );
    const t = await assertOrgMemberForDigitalSponsor(
      context.supabase,
      supabaseAdmin,
      context.userId,
      data.tournamentId,
    );
    if (t.digital_sponsor_purchased)
      throw new Error("The Digital Sponsor package is already active for this event");

    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Stripe is not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });

    const origin = data.origin || "https://teevents.golf";
    const returnPath = data.returnPath || "/dashboard/sponsorship-tools";
    const amount = t.digital_sponsor_amount_cents ?? DIGITAL_SPONSOR_AMOUNT_CENTS;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TeeVents Digital Sponsor Package — One Event",
              description: `Turnkey digital sponsorship package for: ${t.title}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${returnPath}?tournament=${t.id}&digital_sponsor_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?tournament=${t.id}&digital_sponsor_canceled=1`,
      metadata: {
        type: "digital_sponsor",
        tournament_id: t.id,
        organization_id: t.organization_id,
        user_id: context.userId,
      },
    });

    return { url: session.url };
  });

/** Confirms the Stripe session and activates the Digital Sponsor package. */
export const verifyDigitalSponsorPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId) throw new Error("sessionId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertOrgMemberForDigitalSponsor, DIGITAL_SPONSOR_AMOUNT_CENTS } = await import(
      "./digitalSponsor.server"
    );

    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Stripe is not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });

    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    const tournamentId = session.metadata?.tournament_id;
    if (!tournamentId) throw new Error("Missing tournament in session metadata");

    await assertOrgMemberForDigitalSponsor(
      context.supabase,
      supabaseAdmin,
      context.userId,
      tournamentId,
    );

    if (session.payment_status !== "paid") return { verified: false as const };

    await supabaseAdmin
      .from("tournaments")
      .update({
        digital_sponsor_purchased: true,
        digital_sponsor_purchased_at: new Date().toISOString(),
        digital_sponsor_amount_cents: session.amount_total ?? DIGITAL_SPONSOR_AMOUNT_CENTS,
      })
      .eq("id", tournamentId);

    return { verified: true as const, tournament_id: tournamentId };
  });

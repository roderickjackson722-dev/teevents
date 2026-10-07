import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLATFORM_FEE_RATE = 0.05;

const grossUpProcessingFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] || char);

export const sendRegistrationPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { registrationId: string; recipientEmail: string; amountCents: number; origin: string }) => {
    if (!input?.registrationId) throw new Error("Registration is required");
    const recipientEmail = String(input.recipientEmail || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) throw new Error("Enter a valid email address");
    const amountCents = Math.round(Number(input.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < 50 || amountCents > 1_000_000) {
      throw new Error("Payment amount must be between $0.50 and $10,000");
    }
    const origin = /^https?:\/\//.test(input.origin || "") ? input.origin.replace(/\/$/, "") : "https://www.teevents.golf";
    return { registrationId: input.registrationId, recipientEmail, amountCents, origin };
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: registration } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, tournament_id, first_name, last_name, email, payment_status, payment_method")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (!registration) throw new Error("Registration not found");
    if (String(registration.payment_status).toLowerCase() === "paid") throw new Error("This registration is already paid");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, pricing_version, pricing_model, flat_rate_enabled, pass_fees_to_participants")
      .eq("id", registration.tournament_id)
      .maybeSingle();
    if (!tournament) throw new Error("Tournament not found");

    const { data: membership } = await context.supabase
      .from("org_members")
      .select("user_id")
      .eq("organization_id", tournament.organization_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Not authorized for this tournament");

    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Payments are not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });

    const { data: organization } = await supabaseAdmin
      .from("organizations")
      .select("name, stripe_account_id")
      .eq("id", tournament.organization_id)
      .maybeSingle();
    let stripeAccountId: string | null = organization?.stripe_account_id || null;
    if (stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (!account.charges_enabled) stripeAccountId = null;
      } catch {
        stripeAccountId = null;
      }
    }

    const isCurrentFree = tournament.pricing_version === "2026-10" && tournament.pricing_model === "free";
    const isCurrentPaid = tournament.pricing_version === "2026-10" && ["per_event", "enterprise"].includes(tournament.pricing_model || "");
    const platformFeeCents = tournament.flat_rate_enabled || isCurrentPaid
      ? 0
      : Math.round(data.amountCents * PLATFORM_FEE_RATE);
    const golferPaysFees = isCurrentFree || tournament.pass_fees_to_participants !== false;
    const stripeFeeCents = golferPaysFees ? grossUpProcessingFee(data.amountCents + platformFeeCents) : 0;
    const chargeTotalCents = data.amountCents + (golferPaysFees ? platformFeeCents + stripeFeeCents : 0);
    const applicationFeeCents = stripeAccountId ? platformFeeCents : 0;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: data.recipientEmail,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Registration — ${tournament.title}`,
            description: `${registration.first_name} ${registration.last_name}`,
          },
          unit_amount: chargeTotalCents,
        },
        quantity: 1,
      }],
      success_url: `${data.origin}/t/${tournament.slug}?registered=true&session_id={CHECKOUT_SESSION_ID}${stripeAccountId ? `&acct=${stripeAccountId}` : ""}`,
      cancel_url: `${data.origin}/t/${tournament.slug}#register`,
      ...(applicationFeeCents > 0 ? { payment_intent_data: { application_fee_amount: applicationFeeCents } } : {}),
      metadata: {
        type: "registration",
        tournament_id: tournament.id,
        organization_id: tournament.organization_id,
        registration_ids: registration.id,
        pass_fees_to_golfer: String(golferPaysFees),
        gross_registration_cents: String(data.amountCents),
        base_total_cents: String(data.amountCents),
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeCents),
        organizer_net_cents: String(golferPaysFees ? data.amountCents : Math.max(data.amountCents - platformFeeCents, 0)),
        charge_total_cents: String(chargeTotalCents),
        player_count: "1",
        payment_link_for_existing_registration: "true",
      },
    }, stripeAccountId ? { stripeAccount: stripeAccountId } : undefined);
    if (!session.url) throw new Error("Could not create payment link");

    await supabaseAdmin.from("payment_routing_logs").insert({
      context: "registration_payment_link",
      tournament_id: tournament.id,
      organization_id: tournament.organization_id,
      organizer_stripe_account_id: stripeAccountId,
      organizer_charges_ready: !!stripeAccountId,
      payment_method_override: "default",
      routing_decision: stripeAccountId ? "direct" : "platform_fallback",
      gross_cents: data.amountCents,
      platform_fee_cents: platformFeeCents,
      stripe_fee_cents: stripeFeeCents,
      application_fee_cents: applicationFeeCents,
      pass_fees_to_participants: golferPaysFees,
      stripe_session_id: session.id,
      buyer_email: data.recipientEmail,
      notes: `Payment link for existing registration ${registration.id}`,
    });

    const emailKey = process.env["RESEND_API_KEY"];
    if (!emailKey) throw new Error("Email service is not configured");
    const playerName = `${registration.first_name} ${registration.last_name}`.trim();
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${emailKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: [data.recipientEmail],
        reply_to: "info@teevents.golf",
        subject: `Complete payment for ${tournament.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937"><h1 style="color:#1a5c38;font-size:24px">Complete your registration payment</h1><p>Hi ${escapeHtml(registration.first_name)},</p><p>Your spot for <strong>${escapeHtml(tournament.title)}</strong> is listed under <strong>${escapeHtml(playerName)}</strong> and is awaiting payment.</p><p style="font-size:20px;font-weight:700">Amount: $${(data.amountCents / 100).toFixed(2)}</p><p><a href="${session.url}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:12px 22px;text-decoration:none;font-weight:700;border-radius:6px">Pay Registration</a></p><p style="font-size:12px;color:#6b7280">This link collects payment for the existing roster entry; it does not create another player.</p></div>`,
      }),
    });
    if (!emailResponse.ok) {
      const body = await emailResponse.text();
      console.error(`[registration-payment-link] email failed [${emailResponse.status}]: ${body}`);
      throw new Error("The payment link was created, but the email could not be sent");
    }

    return { sent: true, recipientEmail: data.recipientEmail, amountCents: data.amountCents };
  });
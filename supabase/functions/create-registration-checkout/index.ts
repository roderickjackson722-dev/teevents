import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml, sendRegistrantConfirmationEmail } from "../_shared/notify.ts";
import { logRoutingDecision } from "../_shared/connectRouting.ts";

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee
const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);
const calculateProcessingFee = (chargeAmountCents: number) =>
  Math.max(0, Math.round(chargeAmountCents * 0.029 + 30));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const isFoursome = body.foursome === true && Array.isArray(body.players);
    const coverFees = body.cover_fees === true;
    const tierId = body.tier_id || null;
    const addonSelections: { addon_id: string; qty_per_player: number }[] = Array.isArray(body.addons)
      ? body.addons.filter((a: any) => a && typeof a.addon_id === "string" && Number.isFinite(Number(a.qty_per_player)) && Number(a.qty_per_player) > 0)
        .map((a: any) => ({ addon_id: String(a.addon_id), qty_per_player: Math.floor(Number(a.qty_per_player)) }))
      : [];

    const players = isFoursome
      ? body.players
      : [{
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: body.phone,
          handicap: body.handicap,
          shirt_size: body.shirt_size,
          dietary_restrictions: body.dietary_restrictions,
          notes: body.notes,
        }];

    const tournament_id = body.tournament_id;
    const first_name = players[0].first_name;
    const last_name = players[0].last_name;
    const email = players[0].email;

    if (!tournament_id || !first_name || !last_name || !email) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, registration_open, site_published, registration_fee_cents, date, end_date, location, pass_fees_to_participants, allow_cover_fees, payment_method_override")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) throw new Error("Tournament not found");
    if (!tournament.registration_open || !tournament.site_published) {
      throw new Error("Registration is not open for this tournament");
    }

    // Fetch organizer's Stripe Connect account ID
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", tournament.organization_id)
      .single();

    const organizerStripeAccountId = org?.stripe_account_id || null;

    // Validate the connected account is fully onboarded and able to accept charges.
    // Without this, an account row that exists but isn't `charges_enabled` would silently
    // fall through to the platform escrow, sending organizer funds to TeeVents.
    const _stripeForValidation = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    let organizerChargesReady = false;
    if (organizerStripeAccountId) {
      try {
        const acct = await _stripeForValidation.accounts.retrieve(organizerStripeAccountId);
        organizerChargesReady = !!acct.charges_enabled;
        console.log(`[Routing/registration] acct ${organizerStripeAccountId}: charges_enabled=${acct.charges_enabled}, payouts_enabled=${acct.payouts_enabled}, details_submitted=${acct.details_submitted}`);
      } catch (e) {
        console.error(`[Routing/registration] Failed to retrieve connected account ${organizerStripeAccountId}:`, e);
      }
    }

    // Determine routing based on admin override + organizer connection state
    // - default      → organizer Stripe if connected & charge-ready, else platform escrow
    // - force_stripe → must use organizer Stripe (error if missing or not charge-ready)
    // - force_platform → always platform escrow (TeeVents direct charge, no destination)
    const override = (tournament as any).payment_method_override || "default";
    let useDestinationCharge = false;
    if (override === "force_stripe") {
      if (!organizerStripeAccountId) {
        throw new Error("Tournament organizer has not connected a payment account. Please contact the organizer.");
      }
      if (!organizerChargesReady) {
        throw new Error("Tournament organizer's payment account is connected but not yet enabled for charges. Please contact the organizer to complete Stripe onboarding.");
      }
      useDestinationCharge = true;
    } else if (override === "force_platform") {
      useDestinationCharge = false;
    } else {
      useDestinationCharge = !!organizerStripeAccountId && organizerChargesReady;
    }
    console.log(`[Routing/registration] tournament=${(tournament as any).id} override=${override} acct=${organizerStripeAccountId} ready=${organizerChargesReady} → ${useDestinationCharge ? "DESTINATION (organizer)" : "PLATFORM (TeeVents)"}`);

    // Determine fee per player: use tier price if tier selected, else tournament default
    let feePerPlayer = tournament.registration_fee_cents || 0;
    if (tierId) {
      const { data: tier } = await supabaseAdmin
        .from("tournament_registration_tiers")
        .select("price_cents")
        .eq("id", tierId)
        .eq("tournament_id", tournament_id)
        .eq("is_active", true)
        .single();
      if (tier) feePerPlayer = tier.price_cents;
    }

    const passFeesToParticipants = (tournament as any).pass_fees_to_participants !== false;
    const registrationFeeCents = feePerPlayer * players.length;

    // Validate add-on selections against DB and compute add-on totals
    type ResolvedAddon = { id: string; name: string; price_cents: number; max_per_golfer: number; qty_per_player: number };
    let resolvedAddons: ResolvedAddon[] = [];
    let addonsTotalCents = 0;
    if (addonSelections.length > 0) {
      const ids = addonSelections.map((a) => a.addon_id);
      const { data: dbAddons, error: addonErr } = await supabaseAdmin
        .from("tournament_registration_addons")
        .select("id, name, price_cents, max_per_golfer, is_active, tournament_id")
        .in("id", ids);
      if (addonErr) throw new Error("Failed to load add-ons: " + addonErr.message);
      const byId = new Map((dbAddons || []).map((a: any) => [a.id, a]));
      for (const sel of addonSelections) {
        const a = byId.get(sel.addon_id);
        if (!a || !a.is_active || a.tournament_id !== tournament_id) continue;
        const qty = Math.min(Math.max(1, sel.qty_per_player), Math.max(1, a.max_per_golfer || 1));
        if (qty <= 0) continue;
        resolvedAddons.push({
          id: a.id,
          name: a.name,
          price_cents: a.price_cents,
          max_per_golfer: a.max_per_golfer || 1,
          qty_per_player: qty,
        });
        addonsTotalCents += qty * players.length * a.price_cents;
      }
    }

    const baseTotalCents = registrationFeeCents + addonsTotalCents;

    const hasAnyCharge = baseTotalCents > 0;

    // Insert registration records
    const registrationInserts = players.map((p: any) => ({
      tournament_id,
      first_name: (p.first_name || "").trim(),
      last_name: (p.last_name || "").trim(),
      email: (p.email || "").trim(),
      phone: p.phone || null,
      handicap: p.handicap ?? null,
      shirt_size: p.shirt_size || null,
      dietary_restrictions: p.dietary_restrictions || null,
      notes: p.notes || null,
      payment_status: hasAnyCharge ? "pending" : "paid",
      tier_id: tierId || null,
      covered_fees: coverFees,
    }));

    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .insert(registrationInserts)
      .select("id");

    if (regErr) throw new Error(regErr.message);
    const registrationIds = (registrations || []).map((r: any) => r.id);

    // Send notification emails
    try {
      const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");
      await sendNotificationEmails(
        supabaseAdmin,
        tournament.organization_id,
        "notify_registration",
        `New Registration — ${tournament.title}`,
        buildNotificationHtml("New Player Registration", [
          `<strong>${playerNames}</strong> registered for <strong>${tournament.title}</strong>.`,
          `📧 ${email}${players[0].phone ? ` • 📱 ${players[0].phone}` : ""}`,
          isFoursome ? `👥 Foursome registration (${players.length} players)` : "",
          hasAnyCharge ? `💳 Order total: $${(baseTotalCents / 100).toFixed(2)} (payment pending)` : "✅ No fee — confirmed.",
        ].filter(Boolean)),
      );
    } catch (e) {
      console.error("Notification error:", e);
    }

    // If no charges at all (no fee, no addons), registration is complete
    if (!hasAnyCharge) {
      try {
        await sendRegistrantConfirmationEmail(
          first_name, last_name, email.trim(),
          tournament.title, tournament.date, tournament.location,
          tournament.slug, tournament.id,
        );
      } catch (e) {
        console.error("Registrant confirmation error:", e);
      }

      return new Response(
        JSON.stringify({ success: true, paid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Fee required — create Stripe checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: email.trim(), limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");

    // Determine if golfer pays fees:
    // - passFeesToParticipants=true → always pass fees
    // - coverFees=true → golfer opted to cover fees voluntarily
    const golferPaysFees = passFeesToParticipants || coverFees;

    const lineItems: any[] = [];
    // Fees are computed on the COMBINED total (registration + add-ons)
    const platformFeeCents = Math.round(baseTotalCents * PLATFORM_FEE_RATE);
    const stripeFeeCents = golferPaysFees
      ? calculateGrossedUpStripeFee(baseTotalCents + platformFeeCents)
      : calculateProcessingFee(baseTotalCents);
    const combinedFeesCents = platformFeeCents + stripeFeeCents;
    const applicationFeeAmount = combinedFeesCents;
    const organizerNetCents = golferPaysFees
      ? baseTotalCents
      : Math.max(baseTotalCents - combinedFeesCents, 0);
    const chargeTotalCents = golferPaysFees
      ? baseTotalCents + combinedFeesCents
      : baseTotalCents;

    if (registrationFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Registration — ${tournament.title}`,
            description: isFoursome ? `Foursome: ${playerNames}` : playerNames,
          },
          unit_amount: feePerPlayer,
        },
        quantity: players.length,
      });
    }

    // Add-on line items (one line per add-on, quantity = qty_per_player × players)
    for (const a of resolvedAddons) {
      const totalQty = a.qty_per_player * players.length;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: a.name,
            description: players.length > 1 ? `${a.qty_per_player} × ${players.length} players` : undefined,
          },
          unit_amount: a.price_cents,
        },
        quantity: totalQty,
      });
    }

    if (golferPaysFees && combinedFeesCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Fees",
          },
          unit_amount: combinedFeesCents,
        },
        quantity: 1,
      });
    }

    // Compact add-on selections for metadata (Stripe metadata values must be < 500 chars)
    const addonMetaStr = resolvedAddons
      .map((a) => `${a.id}:${a.qty_per_player}:${a.price_cents}:${a.name.replace(/[|,]/g, " ").slice(0, 40)}`)
      .join("|")
      .slice(0, 480);

    const checkoutParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?registered=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament.slug}#register`,
      metadata: {
        type: "registration",
        tournament_id,
        organization_id: tournament.organization_id,
        registration_ids: registrationIds.join(","),
        pass_fees_to_golfer: String(golferPaysFees),
        cover_fees: String(coverFees),
        tier_id: tierId || "",
        gross_registration_cents: String(registrationFeeCents),
        addons_total_cents: String(addonsTotalCents),
        base_total_cents: String(baseTotalCents),
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        organizer_net_cents: String(organizerNetCents),
        charge_total_cents: String(chargeTotalCents),
        routing: useDestinationCharge ? "destination" : "platform_escrow",
        payment_method_override: override,
        addon_selections: addonMetaStr,
        player_count: String(players.length),
      },
    };

    if (useDestinationCharge) {
      // Organizer Stripe Connect: destination charge with platform fee
      checkoutParams.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: organizerStripeAccountId },
        on_behalf_of: organizerStripeAccountId,
      };
    } else {
      // Platform escrow: charge straight to TeeVents account, hold full amount
      // Fee is recorded but not transferred (no organizer destination yet)
      checkoutParams.payment_intent_data = {
        metadata: {
          escrow_for_organization: tournament.organization_id,
          gross_registration_cents: String(registrationFeeCents),
          platform_fee_cents: String(platformFeeCents),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(checkoutParams);

    return new Response(
      JSON.stringify({ success: true, paid: false, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

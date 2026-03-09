import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml, sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

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

    // Extract player data
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

    // Fetch tournament details
    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, registration_open, site_published, registration_fee_cents, date, location")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) throw new Error("Tournament not found");
    if (!tournament.registration_open || !tournament.site_published) {
      throw new Error("Registration is not open for this tournament");
    }

    // Fetch organization plan and nonprofit status
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id, plan, is_nonprofit, ein, nonprofit_name, nonprofit_verified")
      .eq("id", tournament.organization_id)
      .single();

    const orgPlan = org?.plan || "base";
    const isNonprofit = org?.is_nonprofit === true;

    const FEE_RATES: Record<string, number> = {
      base: 0.05,
      starter: 0.03,
      pro: 0.02,
      enterprise: 0.01,
    };
    const feeRate = FEE_RATES[orgPlan] ?? 0.05;

    const feeCents = tournament.registration_fee_cents || 0;
    const totalFeeCents = feeCents * players.length;

    // If donor is covering fees, calculate the Stripe processing fee + platform fee
    const platformFeeCents = Math.round(totalFeeCents * feeRate);
    const stripeFee = coverFees && totalFeeCents > 0 ? Math.round((totalFeeCents + platformFeeCents) * 0.029 + 30) : 0;
    const coverageAmount = coverFees ? stripeFee + platformFeeCents : 0;
    const chargeTotal = totalFeeCents + coverageAmount;

    // Insert registration records for all players
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
      payment_status: feeCents > 0 ? "pending" : "paid",
    }));

    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .insert(registrationInserts)
      .select("id");

    if (regErr) throw new Error(regErr.message);
    const registrationIds = (registrations || []).map((r: any) => r.id);

    // Send notification emails via Resend
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
          feeCents > 0 ? `💳 Registration fee: $${(totalFeeCents / 100).toFixed(2)} (payment pending)` : "✅ No registration fee — confirmed.",
        ].filter(Boolean)),
      );
    } catch (e) {
      console.error("Notification error:", e);
    }

    // If no fee, registration is complete — send confirmation to registrant
    if (feeCents <= 0) {
      try {
        await sendRegistrantConfirmationEmail(
          first_name, last_name, email.trim(),
          tournament.title, tournament.date, tournament.location,
        );
      } catch (e) {
        console.error("Registrant confirmation error:", e);
      }

      return new Response(
        JSON.stringify({ success: true, paid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Fee required — create Stripe checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Look up organizer's connected Stripe account
    const connectedAccountId = org?.stripe_account_id || null;
    
    console.log(`[Registration Checkout] Tournament: ${tournament.title}`);
    console.log(`[Registration Checkout] Fee: $${(chargeTotal / 100).toFixed(2)} (base: $${(totalFeeCents / 100).toFixed(2)}, cover fees: $${(stripeFee / 100).toFixed(2)})`);
    console.log(`[Registration Checkout] Nonprofit: ${isNonprofit}, Plan: ${orgPlan}, Rate: ${feeRate * 100}%`);
    console.log(`[Registration Checkout] Connected Account: ${connectedAccountId || "NONE"}`);

    // Check for existing Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: email.trim(), limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");

    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Registration — ${tournament.title}`,
            description: isFoursome ? `Foursome: ${playerNames}` : playerNames,
          },
          unit_amount: feeCents,
        },
        quantity: players.length,
      },
    ];

    // Add processing fee line item if donor is covering fees
    if (stripeFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Processing Fee Coverage",
            description: "Voluntary fee coverage so 100% goes to the organization",
          },
          unit_amount: stripeFee,
        },
        quantity: 1,
      });
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?registered=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament.slug}#register`,
      metadata: {
        type: "registration",
        tournament_id,
        registration_ids: registrationIds.join(","),
        is_nonprofit: isNonprofit ? "true" : "false",
        ein: org?.ein || "",
        nonprofit_name: org?.nonprofit_name || "",
        cover_fees: coverFees ? "true" : "false",
      },
    };

    // Route payment to connected account with plan-based application fee
    if (connectedAccountId) {
      const applicationFee = Math.round(chargeTotal * feeRate);
      console.log(`[Registration Checkout] Platform fee: $${(applicationFee / 100).toFixed(2)} → Platform Stripe account`);
      console.log(`[Registration Checkout] Organizer payout: $${((chargeTotal - applicationFee) / 100).toFixed(2)} → ${connectedAccountId}`);
      
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: connectedAccountId,
        },
      };
    } else {
      console.log(`[Registration Checkout] No connected account — full payment goes to platform`);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`[Registration Checkout] Session created: ${session.id}`);

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

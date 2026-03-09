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
    const {
      tournament_id,
      first_name,
      last_name,
      email,
      phone,
      handicap,
      shirt_size,
      dietary_restrictions,
      notes,
    } = await req.json();

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
      .select("id, title, slug, organization_id, registration_open, site_published, registration_fee_cents")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) throw new Error("Tournament not found");
    if (!tournament.registration_open || !tournament.site_published) {
      throw new Error("Registration is not open for this tournament");
    }

    // Fetch organization plan to determine fee rate
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id, plan")
      .eq("id", tournament.organization_id)
      .single();

    const orgPlan = org?.plan || "base";
    const FEE_RATES: Record<string, number> = {
      base: 0.05,
      starter: 0.03,
      pro: 0.02,
      enterprise: 0.01,
    };
    const feeRate = FEE_RATES[orgPlan] ?? 0.05;

    const feeCents = tournament.registration_fee_cents || 0;

    // Insert the registration record
    const { data: registration, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .insert({
        tournament_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone || null,
        handicap: handicap ?? null,
        shirt_size: shirt_size || null,
        dietary_restrictions: dietary_restrictions || null,
        notes: notes || null,
        payment_status: feeCents > 0 ? "pending" : "paid",
      })
      .select("id")
      .single();

    if (regErr) throw new Error(regErr.message);

    // Send notification emails via Resend
    try {
      await sendNotificationEmails(
        supabaseAdmin,
        tournament.organization_id,
        "notify_registration",
        `New Registration — ${tournament.title}`,
        buildNotificationHtml("New Player Registration", [
          `<strong>${first_name} ${last_name}</strong> has registered for <strong>${tournament.title}</strong>.`,
          `📧 ${email}${phone ? ` • 📱 ${phone}` : ""}`,
          feeCents > 0 ? `💳 Registration fee: $${(feeCents / 100).toFixed(2)} (payment pending)` : "✅ No registration fee — confirmed.",
        ]),
      );
    } catch (e) {
      console.error("Notification error:", e);
    }

    // If no fee, registration is complete
    if (feeCents <= 0) {
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
    let connectedAccountId: string | null = null;
    connectedAccountId = org?.stripe_account_id || null;

    // Check for existing Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: email.trim(), limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email.trim(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Registration — ${tournament.title}`,
              description: `${first_name} ${last_name}`,
            },
            unit_amount: feeCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?registered=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament.slug}#register`,
      metadata: {
        type: "registration",
        tournament_id,
        registration_id: registration.id,
      },
    };

    // Route payment to connected account with plan-based application fee
    if (connectedAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(feeCents * feeRate),
        transfer_data: {
          destination: connectedAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
